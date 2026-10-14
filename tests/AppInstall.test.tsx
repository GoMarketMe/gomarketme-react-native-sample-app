import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import App from '../App';
import GoMarketMe from 'gomarketme-react-native';

jest.mock('react-native-iap', () => ({
  initConnection: jest.fn().mockResolvedValue(true),
  getAvailablePurchases: jest.fn().mockResolvedValue([]),
  fetchProducts: jest.fn().mockResolvedValue([]),
  purchaseUpdatedListener: jest.fn(() => ({remove: jest.fn()})),
  purchaseErrorListener: jest.fn(() => ({remove: jest.fn()})),
  endConnection: jest.fn(),
}));

jest.mock('gomarketme-react-native', () => {
  const listeners = new Set<() => void>();
  const sdk = {
    initialized: true,
    appInstallRef: 'test-install-reference',
    attributionMode: 'LinksAndReferralCodes',
    affiliateMarketingData: null,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    initialize: jest.fn(async () => {
      sdk.attributionMode = sdk.initialize.mock.calls.length > 1 ? 'ReferralCodesOnly' : 'LinksAndReferralCodes';
      listeners.forEach(listener => listener());
    }),
  };
  return {__esModule: true, default: sdk, GoMarketMeReferralCodeTrigger: () => null};
});

test('shows install reference and updates the active mode after refresh', async () => {
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => { renderer = ReactTestRenderer.create(<App />); });
  expect(renderer.root.findAllByProps({children: 'test-install-reference'})).not.toHaveLength(0);
  expect(renderer.root.findAllByProps({children: 'Refresh SDK configuration'})).toHaveLength(0);
  await ReactTestRenderer.act(async () => { await GoMarketMe.initialize('API_KEY'); });
  expect(GoMarketMe.initialize).toHaveBeenCalledTimes(2);
  expect(renderer.root.findAllByProps({children: 'ReferralCodesOnly'})).not.toHaveLength(0);
  expect(renderer.root.findAllByProps({children: 'Privacy-first: device/system metadata is omitted.'})).toHaveLength(0);
  await ReactTestRenderer.act(async () => { renderer.unmount(); });
});
