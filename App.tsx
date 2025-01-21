import React, { useEffect, useState } from "react";
import {
  SafeAreaView,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
} from "react-native";
import GoMarketMe from "gomarketme-react-native";
import * as RNIap from "react-native-iap";

const PRODUCT_ID = "ProductID4";

const App = () => {
  const [isPurchased, setIsPurchased] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [offerCode, setOfferCode] = useState<string | null>('NO_OFFER_CODE_FOUND');
  const [products, setProducts] = useState<RNIap.Product[]>([]);

  useEffect(() => {

    GoMarketMe.initialize('API_KEY'); // Initialize with your API key

  }, []);

  useEffect(() => {

    const initIAP = async () => {
      try {
        await RNIap.initConnection();
        const availableProducts = await RNIap.getProducts({ skus: [PRODUCT_ID] });
        console.log('availableProducts', availableProducts)
        setProducts(availableProducts);
      } catch (error) {
        console.error("Error initializing IAP:", error);
      }
    };

    initIAP();

    return () => {
      RNIap.endConnection();
    };
  }, []);

  const purchaseProduct = async () => {
    setIsLoading(true);
    try {
      const purchase = await RNIap.requestPurchase({ sku: PRODUCT_ID });
      const transaction = Array.isArray(purchase) ? purchase[0] : purchase;

      if (transaction) {
        setIsPurchased(true);
        Alert.alert("Success", "Purchase completed!");

        await RNIap.finishTransaction({ purchase: transaction, isConsumable: true });
      }
    } catch (error: any) {
      Alert.alert("Error", `Purchase failed: ${error.message}`);
    }
    setIsLoading(false);
  };

  const redeemOfferCode = () => {
    if (!offerCode) {
      Alert.alert("No Offer Code", "No offer code was found.");
      return;
    }
    const redemptionURL = `https://apps.apple.com/redeem/?ctx=offercodes&id=1234&code=${offerCode}`;
    Linking.openURL(redemptionURL).catch((err) =>
      console.error("Failed to open URL:", err)
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.text}>React Native IAP</Text>

      {products.length > 0 ? (
        <TouchableOpacity
          style={[styles.button, isLoading && styles.disabledButton]}
          onPress={purchaseProduct}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.buttonText}>
              {isPurchased ? "Purchased!" : `Buy ${products[0].title}`}
            </Text>
          )}
        </TouchableOpacity>
      ) : (
        <Text style={styles.text}>No products available</Text>
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
  text: {
    fontSize: 24,
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
  disabledButton: {
    opacity: 0.6,
  },
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
