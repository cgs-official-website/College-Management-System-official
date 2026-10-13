module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    // Reanimated 4 + worklets installed => 'react-native-worklets/plugin'
    // Reanimated 3 only => replace with 'react-native-reanimated/plugin'
    // This plugin MUST stay last in the list.
    'react-native-worklets/plugin',
  ],
};
