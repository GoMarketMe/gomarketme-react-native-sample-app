import React, { useEffect, useState } from "react";
import {
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  initConnection,
  purchaseUpdatedListener,
  purchaseErrorListener,
  fetchProducts,
  requestPurchase,
  finishTransaction,
  endConnection,
  getAvailablePurchases,
  type Product,
  type Purchase,
  type PurchaseError,
} from "react-native-iap";

import GoMarketMe, { GoMarketMeAffiliateMarketingData } from "gomarketme-react-native";

const PRODUCT_IDS = ["ProductID4"]; //["ReactNativeSubscription1"] (iOS); //product1 (Android)

const App = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPurchased, setIsPurchased] = useState(false);
  const [offerCode] = useState<string>("NO_OFFER_CODE_FOUND");

  // Basic Integration

  useEffect(() => {
    GoMarketMe.initialize('API_KEY'); // Initialize with your API key
  }, []);


  // Advanced Integration

  // const goMarketMeSDK = GoMarketMe;
  // const [affiliateData, setAffiliateData] = useState<GoMarketMeAffiliateMarketingData | null>(null);

  // useEffect(() => {
  //   const initGoMarketMe = async () => {
  //     try {
  //       await goMarketMeSDK.initialize('API_KEY'); // Initialize with your API key
  //       const data = goMarketMeSDK.affiliateMarketingData;

  //       if (data) { // user acquired through affiliate campaign
  //         setAffiliateData(data);

  //         console.log('Affiliate ID:', data.affiliate?.id);                          // maps to GoMarketMe > Affiliates > Export > id column
  //         console.log('Affiliate %:', data.saleDistribution?.affiliatePercentage);   // maps to GoMarketMe > Campaigns > [Name] > Affiliate's Revenue Split (%)
  //         console.log('Campaign ID:', data.campaign?.id);                            // maps to GoMarketMe > Campaigns > [Name] > id in the URL
  //       }
  //     } catch (error) {
  //       console.error('Failed to initialize GoMarketMe:', error);
  //       Alert.alert('Initialization Error', 'Could not initialize GoMarketMe SDK');
  //     }
  //   };

  //   initGoMarketMe();
  // }, []);

  // 


  useEffect(() => {
    let purchaseUpdateSub: any;
    let purchaseErrorSub: any;

    const initIap = async () => {
      try {
        console.log("🧩 Initializing IAP connection...");
        const connected = await initConnection();
        console.log("✅ IAP connected:", connected);

        // --- List any existing purchases ---
        const purchases = await getAvailablePurchases();
        console.log("🧾 Existing purchases:", purchases);

        // --- Listeners ---
        purchaseUpdateSub = purchaseUpdatedListener(
          async (purchase: Purchase) => {
            console.log("purchaseUpdatedListener:", purchase);
            if (purchase.purchaseToken) {
              try {
                await finishTransaction({ purchase, isConsumable: true });
                console.log("✅ finishTransaction completed:", purchase.productId);
                setIsPurchased(true);
              } catch (finishErr) {
                console.error("finishTransaction error:", finishErr);
              }
            }
          }
        );

        purchaseErrorSub = purchaseErrorListener((error: PurchaseError) => {
          console.warn("purchaseErrorListener:", error);
          Alert.alert("Purchase Error", error.message);
        });

        // --- Fetch products ---
        const items = await fetchProducts({ skus: PRODUCT_IDS });
        console.log("✅ fetched products:", items);
        setProducts(items ?? []);
      } catch (err) {
        console.error("❌ IAP init error:", err);
        Alert.alert("IAP Error", "Failed to initialize In-App Purchases.");
      }
    };

    initIap();

    return () => {
      purchaseUpdateSub?.remove();
      purchaseErrorSub?.remove();
      endConnection();
    };
  }, []);

  const handlePurchase = async () => {
    if (!products.length) {
      Alert.alert("Unavailable", "No products available for purchase.");
      return;
    }

    setIsLoading(true);
    try {
      console.log("🛒 requestPurchase:", PRODUCT_IDS[0]);
      await requestPurchase({
        request: {
          ios: { sku: PRODUCT_IDS[0], quantity: 1 },
          android: { skus: [PRODUCT_IDS[0]] },
        },
        type: 'in-app',
      });

    } catch (err: any) {
      console.error("❌ requestPurchase error:", err);
      Alert.alert("Error", err.message ?? "Purchase failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const redeemOfferCode = () => {
    const redemptionURL = `https://apps.apple.com/redeem/?ctx=offercodes&id=1234&code=${offerCode}`;
    Linking.openURL(redemptionURL).catch((err) =>
      console.error("Failed to open URL:", err)
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Sample React Native App</Text>

      {products.length > 0 ? (
        <TouchableOpacity
          style={[styles.button, isLoading && styles.disabledButton]}
          onPress={handlePurchase}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.buttonText}>
              {isPurchased
                ? "Purchased!"
                : `Buy ${products[0]?.title || PRODUCT_IDS[0]} (${products[0]?.displayPrice || ""})`}
            </Text>
          )}
        </TouchableOpacity>
      ) : (
        <Text>No products available</Text>
      )}

      <TouchableOpacity style={styles.linkButton} onPress={redeemOfferCode}>
        <Text style={styles.linkText}>Redeem Offer Code: {offerCode}</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 20,
  },
  button: {
    backgroundColor: "#007AFF",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 10,
  },
  disabledButton: { opacity: 0.6 },
  buttonText: {
    fontSize: 18,
    color: "#FFF",
  },
  linkButton: {
    marginTop: 20,
  },
  linkText: {
    fontSize: 16,
    color: "#007AFF",
    textDecorationLine: "underline",
  },
});

export default App;
