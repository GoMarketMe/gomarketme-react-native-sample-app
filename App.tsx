import React, { useEffect } from 'react';
import { SafeAreaView, Text, StyleSheet } from 'react-native';
import GoMarketMe from 'gomarketme-react-native';

// Note:
// Make sure your app's `package.json` depends on `@react-native-async-storage/async-storage` 
// and other dependencies that 'gomarketme-react-native' has.
// CLI only autolinks native modules found in your app's `package.json`.

const App = () => {

  useEffect(() => {
    const initializeGoMarketMe = async () => {
      const apiKey = 'YOUR_API_KEY_HERE';
      try {
        await GoMarketMe.initialize(apiKey);
        console.log('GoMarketMe initialized successfully');
      } catch (error) {
        console.error('Error initializing GoMarketMe:', error);
      }
    };

    initializeGoMarketMe();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.text}>Hi, there! 1.1.1</Text>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  text: {
    fontSize: 32,
    color: '#333',
  },
});

export default App;
