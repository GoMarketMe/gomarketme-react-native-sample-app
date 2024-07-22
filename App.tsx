import React, { useEffect } from 'react';
import { SafeAreaView, Text, Button, StyleSheet, Alert } from 'react-native';
import GoMarketMe from 'gomarketme-react-native';

const App: React.FC = () => {
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
      <Text style={styles.title}>Test GoMarketMe Package</Text>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5FCFF',
  },
  title: {
    fontSize: 20,
    textAlign: 'center',
    margin: 10,
  },
});

export default App;
