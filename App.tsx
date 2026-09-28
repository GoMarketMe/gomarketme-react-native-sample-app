import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  endConnection,
  fetchProducts,
  finishTransaction,
  getAvailablePurchases,
  initConnection,
  purchaseErrorListener,
  purchaseUpdatedListener,
  requestPurchase,
  type Product,
  type PurchaseError,
} from 'react-native-iap';

import GoMarketMe, {
  GoMarketMeAffiliateMarketingData,
  GoMarketMeReferralCodeError,
  GoMarketMeReferralCodeErrorCode,
  GoMarketMeReferralCodeTrigger,
} from 'gomarketme-react-native';

const PRODUCT_IDS = ['ReactNativeSubscription1'];
const APPLE_APP_ID = '1234';

type MessageKind = 'info' | 'success' | 'error';
type SampleMessage = { kind: MessageKind; text: string };
type InitializationState = 'initializing' | 'ready' | 'error';

const info = (text: string): SampleMessage => ({ kind: 'info', text });
const success = (text: string): SampleMessage => ({ kind: 'success', text });
const failure = (text: string): SampleMessage => ({ kind: 'error', text });

const App = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [affiliateData, setAffiliateData] =
    useState<GoMarketMeAffiliateMarketingData | null>(null);
  const [initializationState, setInitializationState] =
    useState<InitializationState>('initializing');
  const [initializationError, setInitializationError] = useState<string>();
  const [iapReady, setIapReady] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isPurchased, setIsPurchased] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<SampleMessage | null>(null);
  const [purchaseMessage, setPurchaseMessage] = useState<SampleMessage | null>(
    null,
  );
  const [referralMessage, setReferralMessage] = useState<SampleMessage | null>(
    null,
  );
  const [referralCodeInput, setReferralCodeInput] = useState('');
  const [isRedeemingReferralCode, setIsRedeemingReferralCode] = useState(false);

  useEffect(() => {
    let active = true;

    const initializeGoMarketMe = async () => {
      await GoMarketMe.initialize('API_KEY');
      if (!active) {
        return;
      }

      if (!GoMarketMe.initialized) {
        setInitializationState('error');
        setInitializationError('GoMarketMe could not initialize.');
        return;
      }

      setAffiliateData(GoMarketMe.affiliateMarketingData ?? null);
      setInitializationState('ready');
    };

    initializeGoMarketMe().catch(error => {
      if (active) {
        setInitializationState('error');
        setInitializationError(String(error));
      }
    });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    let purchaseUpdateSubscription: { remove: () => void } | undefined;
    let purchaseErrorSubscription: { remove: () => void } | undefined;

    const initializePurchases = async () => {
      try {
        await initConnection();
        if (!active) {
          return;
        }

        setIapReady(true);
        await getAvailablePurchases();

        purchaseUpdateSubscription = purchaseUpdatedListener(async purchase => {
          setIsPurchasing(true);
          let synced = false;

          try {
            const result = await GoMarketMe.syncAllTransactions();
            synced = result.success;
          } catch (error) {
            console.error('GoMarketMe purchase sync failed:', error);
          }

          try {
            await finishTransaction({ purchase, isConsumable: true });
            setIsPurchased(true);
            setPurchaseMessage(
              synced
                ? success('Purchase completed and synced.')
                : failure(
                    'Purchase completed, but GoMarketMe sync needs attention.',
                  ),
            );
          } catch (error) {
            setPurchaseMessage(
              failure(`Could not finish the transaction: ${String(error)}`),
            );
          } finally {
            setIsPurchasing(false);
          }
        });

        purchaseErrorSubscription = purchaseErrorListener(
          (error: PurchaseError) => {
            setIsPurchasing(false);
            setPurchaseMessage(failure(error.message));
          },
        );

        const items = await fetchProducts({ skus: PRODUCT_IDS });
        if (active) {
          setProducts((items as Product[]) ?? []);
          if (!items?.length) {
            setPurchaseMessage(
              info(`Test product not found: ${PRODUCT_IDS[0]}`),
            );
          }
        }
      } catch (error) {
        if (active) {
          setPurchaseMessage(
            failure(`Purchase setup failed: ${String(error)}`),
          );
        }
      }
    };

    initializePurchases();

    return () => {
      active = false;
      purchaseUpdateSubscription?.remove();
      purchaseErrorSubscription?.remove();
      endConnection();
    };
  }, []);

  const syncCurrentPurchases = async () => {
    if (isSyncing) {
      return;
    }

    setIsSyncing(true);
    setSyncMessage(null);
    try {
      const result = await GoMarketMe.syncAllTransactions();
      setSyncMessage(
        result.success
          ? success(
              `Synced ${result.sentCount} of ${result.fetchedCount} transaction(s).`,
            )
          : failure(
              `Sync did not complete. ${result.failedCount} transaction(s) failed.`,
            ),
      );
    } catch (error) {
      setSyncMessage(failure(`Purchase sync failed: ${String(error)}`));
    } finally {
      setIsSyncing(false);
    }
  };

  const handlePurchase = async () => {
    if (!products.length) {
      setPurchaseMessage(failure('No test product is available.'));
      return;
    }

    setIsPurchasing(true);
    setIsPurchased(false);
    setPurchaseMessage(null);
    try {
      await requestPurchase({
        request: {
          ios: { sku: PRODUCT_IDS[0], quantity: 1 },
          android: { skus: [PRODUCT_IDS[0]] },
        },
        type: 'in-app',
      });
    } catch (error: any) {
      setIsPurchasing(false);
      setPurchaseMessage(failure(error?.message ?? 'Purchase failed.'));
    }
  };

  const redeemOfferCode = async () => {
    const code = nonEmpty(affiliateData?.offerCode);
    const codeQuery = code ? `&code=${encodeURIComponent(code)}` : '';
    const url =
      `https://apps.apple.com/redeem/?ctx=offercodes&id=${APPLE_APP_ID}` +
      codeQuery;

    try {
      await Linking.openURL(url);
    } catch (error) {
      Alert.alert('Apple offer code', String(error));
    }
  };

  const redeemReferralCode = async () => {
    const code = nonEmpty(referralCodeInput);
    if (!code || isRedeemingReferralCode) return;
    setIsRedeemingReferralCode(true);
    try {
      const data = await GoMarketMe.redeemReferralCode(code);
      setAffiliateData(data);
      setReferralCodeInput('');
      setReferralMessage(success(`Referral code ${data.referralCode ?? code} applied.`));
    } catch (error) {
      setReferralMessage(failure(referralErrorMessage(error)));
    } finally {
      setIsRedeemingReferralCode(false);
    }
  };

  const product = products[0];
  const referralCode = nonEmpty(affiliateData?.referralCode);
  const offerCode = nonEmpty(affiliateData?.offerCode);

  return (
    <SafeAreaView
      edges={['top', 'right', 'bottom', 'left']}
      style={styles.safeArea}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerTitleRow}>
            <Image
              accessibilityLabel="GoMarketMe logo"
              source={require('./assets/gomarketme-logo.png')}
              style={styles.headerLogo}
            />
            <Text style={styles.headerTitle}>GoMarketMe React Native SDK</Text>
          </View>
          <Text style={styles.headerSubtitle}>
            Sample integration · SDK 6.0.1
          </Text>
        </View>

        <SampleSection
          badge="Required"
          title="Initialize"
          description="Initialize once when your app starts. Affiliate-link attribution is handled automatically."
        >
          <View style={styles.statusRow}>
            {initializationState === 'initializing' ? (
              <ActivityIndicator color="#1677FF" />
            ) : (
              <Text
                style={[
                  styles.statusSymbol,
                  initializationState === 'ready'
                    ? styles.successText
                    : styles.errorText,
                ]}
              >
                {initializationState === 'ready' ? '✓' : '!'}
              </Text>
            )}
            <View style={styles.statusCopy}>
              <Text style={styles.statusTitle}>
                {initializationState === 'initializing'
                  ? 'Initializing GoMarketMe…'
                  : initializationState === 'ready'
                  ? 'SDK ready'
                  : 'Initialization failed'}
              </Text>
              <Text style={styles.statusDetail}>
                {initializationError ??
                  (initializationState === 'ready'
                    ? affiliateData
                      ? 'Ready · attribution loaded'
                      : 'Ready · no existing attribution'
                    : "Calling GoMarketMe.initialize('API_KEY')")}
              </Text>
            </View>
          </View>
        </SampleSection>

        <SampleSection
          badge="Optional"
          title="Referral codes"
          description="Referral codes are the fallback when an affiliate link is not practical. Place this UI on the first screen users see after installing the app."
        >
          <GoMarketMeReferralCodeTrigger
            onResult={data => {
              if (!data) {
                return;
              }
              setAffiliateData(data);
              const code = nonEmpty(data.referralCode);
              setReferralMessage(
                code
                  ? success(`Referral code ${code} applied.`)
                  : info(
                      'This device is already attributed through an affiliate link.',
                    ),
              );
            }}
            onError={error => setReferralMessage(failure(String(error)))}
          />
          <View style={styles.divider} />
          <Text style={styles.subsectionTitle}>Custom referral-code UI</Text>
          <TextInput
            autoCapitalize="characters"
            autoCorrect={false}
            onChangeText={setReferralCodeInput}
            placeholder="Referral code"
            style={styles.textInput}
            value={referralCodeInput}
          />
          <SecondaryButton
            label={isRedeemingReferralCode ? 'Applying…' : 'Apply referral code'}
            disabled={
              initializationState !== 'ready' ||
              isRedeemingReferralCode ||
              !nonEmpty(referralCodeInput)
            }
            onPress={redeemReferralCode}
          />
          {referralMessage && <MessageView message={referralMessage} />}
          <Text style={styles.hint}>
            The trigger text, colors, typography, and layout are configured in
            GoMarketMe.
          </Text>
        </SampleSection>

        <SampleSection
          badge="Recommended"
          title="Report purchases"
          description="GoMarketMe detects and reports purchases automatically. We also recommend manually syncing after your purchase provider confirms a successful transaction."
        >
          <PrimaryButton
            label={isSyncing ? 'Syncing…' : 'Manually sync purchases'}
            disabled={initializationState !== 'ready' || isSyncing}
            loading={isSyncing}
            onPress={syncCurrentPurchases}
          />
          {syncMessage && <MessageView message={syncMessage} />}

          <View style={styles.divider} />
          <Text style={styles.subsectionTitle}>In-app purchase test</Text>
          <Text style={styles.hint}>
            Uses the sample product {PRODUCT_IDS[0]}. After purchase, the sample
            syncs with GoMarketMe before finishing the transaction.
          </Text>
          <SecondaryButton
            label={
              isPurchasing
                ? 'Purchasing…'
                : isPurchased
                ? 'Purchased'
                : product
                ? `Buy ${product.title} (${product.displayPrice ?? ''})`
                : 'Test product unavailable'
            }
            disabled={!iapReady || !product || isPurchasing}
            onPress={handlePurchase}
          />
          {purchaseMessage && <MessageView message={purchaseMessage} />}
        </SampleSection>

        <SampleSection
          badge="Optional"
          title="Programmatic affiliate data"
          description="Use the initialization response to personalize onboarding, paywalls, offers, or other app content."
        >
          {affiliateData ? (
            <>
              <KeyValueRow
                label="Attribution"
                value={
                  referralCode
                    ? `Referral code (${referralCode})`
                    : 'Affiliate link'
                }
              />
              <KeyValueRow
                label="Affiliate ID"
                value={affiliateData.affiliate.id}
              />
              <KeyValueRow
                label="Campaign ID"
                value={affiliateData.campaign.id}
              />
              {nonEmpty(affiliateData.deviceId) && (
                <KeyValueRow
                  label="Device ID"
                  value={affiliateData.deviceId.trim()}
                />
              )}
              <KeyValueRow
                label="Affiliate share"
                value={
                  affiliateData.saleDistribution.affiliatePercentage
                    ? `${affiliateData.saleDistribution.affiliatePercentage}%`
                    : '—'
                }
              />
              <KeyValueRow label="Referral code" value={referralCode ?? '—'} />
              <KeyValueRow
                label="Campaign metadata"
                value={metadataJson(affiliateData.campaign.metadata)}
              />
              <KeyValueRow
                label="Affiliate metadata"
                value={metadataJson(affiliateData.affiliate.metadata)}
              />
              <KeyValueRow
                label="Affiliate campaign metadata"
                value={metadataJson(affiliateData.affiliateCampaign.metadata)}
              />
              {Platform.OS === 'ios' && (
                <KeyValueRow
                  label="Apple offer code"
                  value={offerCode ?? '—'}
                />
              )}
              <Text style={styles.hint}>
                This device is attributed. A referral code cannot replace the
                existing attribution.
              </Text>
            </>
          ) : (
            <MessageView
              message={info(
                'No attribution is active. Referral codes remain available as a fallback.',
              )}
            />
          )}
        </SampleSection>

        {Platform.OS === 'ios' && (
          <SampleSection
            badge="iOS feature"
            title="Apple offer codes"
            description="Apple subscription offer codes are separate from GoMarketMe referral codes. This opens Apple's redemption flow."
          >
            <Text style={styles.hint}>
              {offerCode
                ? `Detected offer code: ${offerCode}`
                : 'No offer code was detected, but users can still enter one manually.'}
            </Text>
            <SecondaryButton
              label="Open Apple offer-code redemption"
              onPress={redeemOfferCode}
            />
          </SampleSection>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

type SampleSectionProps = {
  badge: string;
  title: string;
  description: string;
  children: React.ReactNode;
};

const SampleSection = ({
  badge,
  title,
  description,
  children,
}: SampleSectionProps) => (
  <View style={styles.card}>
    <View style={styles.sectionHeading}>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{badge}</Text>
      </View>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
    <Text style={styles.description}>{description}</Text>
    <View style={styles.sectionContent}>{children}</View>
  </View>
);

type ButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
};

const PrimaryButton = ({
  label,
  onPress,
  disabled = false,
  loading = false,
}: ButtonProps) => (
  <TouchableOpacity
    accessibilityRole="button"
    activeOpacity={0.8}
    disabled={disabled}
    onPress={onPress}
    style={[styles.primaryButton, disabled && styles.disabled]}
  >
    {loading && <ActivityIndicator color="#FFFFFF" style={styles.spinner} />}
    <Text style={styles.primaryButtonText}>{label}</Text>
  </TouchableOpacity>
);

const SecondaryButton = ({ label, onPress, disabled = false }: ButtonProps) => (
  <TouchableOpacity
    accessibilityRole="button"
    activeOpacity={0.8}
    disabled={disabled}
    onPress={onPress}
    style={[styles.secondaryButton, disabled && styles.disabled]}
  >
    <Text style={styles.secondaryButtonText}>{label}</Text>
  </TouchableOpacity>
);

const KeyValueRow = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.keyValueRow}>
    <Text style={styles.keyLabel}>{label}</Text>
    <Text selectable style={styles.keyValue}>
      {value || '—'}
    </Text>
  </View>
);

const MessageView = ({ message }: { message: SampleMessage }) => {
  const palette = {
    info: { color: '#1261A0', background: '#E8F3FC' },
    success: { color: '#087A45', background: '#E7F7EF' },
    error: { color: '#C62828', background: '#FDECEC' },
  }[message.kind];

  return (
    <View style={[styles.message, { backgroundColor: palette.background }]}>
      <Text style={[styles.messageText, { color: palette.color }]}>
        {message.text}
      </Text>
    </View>
  );
};

const nonEmpty = (value?: string | null): string | undefined => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
};

const referralErrorMessage = (error: unknown): string => {
  if (!(error instanceof GoMarketMeReferralCodeError)) {
    return String(error);
  }
  switch (error.code) {
    case GoMarketMeReferralCodeErrorCode.InvalidCode:
      return 'That referral code is not valid. Check it and try again.';
    case GoMarketMeReferralCodeErrorCode.ExpiredCode:
      return 'That referral code has expired.';
    case GoMarketMeReferralCodeErrorCode.InactiveCode:
      return 'That referral code is no longer active.';
    case GoMarketMeReferralCodeErrorCode.NetworkError:
    case GoMarketMeReferralCodeErrorCode.Timeout:
      return 'Could not connect. Check your connection and try again.';
    case GoMarketMeReferralCodeErrorCode.NotInitialized:
      return 'Referral codes are not ready yet. Please try again.';
    default:
      return error.isRetryable
        ? 'Could not apply the referral code. Please try again.'
        : error.message;
  }
};

const metadataJson = (metadata: Record<string, unknown>): string =>
  JSON.stringify(metadata);

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F4F5F8',
  },
  content: {
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 32,
  },
  header: {
    marginBottom: 20,
  },
  headerTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  headerLogo: {
    height: 40,
    marginRight: 10,
    width: 40,
  },
  headerTitle: {
    color: '#1677FF',
    fontSize: 28,
    fontWeight: '700',
  },
  headerSubtitle: {
    color: '#68707C',
    fontSize: 15,
    marginTop: 5,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 16,
    padding: 18,
  },
  sectionHeading: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  badge: {
    backgroundColor: '#1677FF',
    borderRadius: 999,
    marginRight: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  sectionTitle: {
    color: '#161B22',
    fontSize: 21,
    fontWeight: '700',
  },
  description: {
    color: '#68707C',
    fontSize: 15,
    lineHeight: 21,
    marginTop: 12,
  },
  sectionContent: {
    marginTop: 16,
  },
  statusRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  statusSymbol: {
    fontSize: 26,
    fontWeight: '700',
    textAlign: 'center',
    width: 28,
  },
  statusCopy: {
    flex: 1,
    marginLeft: 12,
  },
  statusTitle: {
    color: '#161B22',
    fontSize: 17,
    fontWeight: '600',
  },
  statusDetail: {
    color: '#68707C',
    fontSize: 13,
    marginTop: 2,
  },
  successText: {
    color: '#0A9A58',
  },
  errorText: {
    color: '#D32F2F',
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#1677FF',
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 16,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  secondaryButton: {
    alignItems: 'center',
    borderColor: '#C8CED8',
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    marginTop: 12,
    minHeight: 48,
    paddingHorizontal: 16,
  },
  secondaryButtonText: {
    color: '#1677FF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  textInput: {
    borderColor: '#C8CED8',
    borderRadius: 10,
    borderWidth: 1,
    color: '#161B22',
    fontSize: 16,
    marginTop: 10,
    minHeight: 48,
    paddingHorizontal: 12,
  },
  disabled: {
    opacity: 0.5,
  },
  spinner: {
    marginRight: 8,
  },
  divider: {
    backgroundColor: '#E1E4E8',
    height: StyleSheet.hairlineWidth,
    marginVertical: 18,
  },
  subsectionTitle: {
    color: '#161B22',
    fontSize: 17,
    fontWeight: '700',
  },
  hint: {
    color: '#68707C',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 10,
  },
  message: {
    borderRadius: 10,
    marginTop: 12,
    padding: 10,
  },
  messageText: {
    fontSize: 13,
    lineHeight: 18,
  },
  keyValueRow: {
    flexDirection: 'row',
    paddingVertical: 5,
  },
  keyLabel: {
    color: '#68707C',
    flex: 1,
    fontSize: 14,
  },
  keyValue: {
    color: '#161B22',
    flex: 1,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
    fontSize: 13,
    textAlign: 'right',
  },
});

export default App;
