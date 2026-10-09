const { withMainApplication } = require('@expo/config-plugins');

module.exports = function withLiveKitMainApplication(config) {
  return withMainApplication(config, (modConfig) => {
    if (modConfig.modResults.language !== 'kt') return modConfig;

    let source = modConfig.modResults.contents;
    if (!source.includes('import com.livekit.reactnative.LiveKitReactNative')) {
      source = source.replace(
        /^import /m,
        'import com.livekit.reactnative.LiveKitReactNative\nimport com.livekit.reactnative.audio.AudioType\nimport ',
      );
    }
    if (!source.includes('LiveKitReactNative.setup(this')) {
      source = source.replace('super.onCreate()', 'super.onCreate()\n    LiveKitReactNative.setup(this, AudioType.CommunicationAudioType())');
    }
    modConfig.modResults.contents = source;
    return modConfig;
  });
};
