import { Platform } from 'react-native';

export const GIPHY_MESSAGE_PREFIX = 'giphy:';

export function getGiphyMessageUrl(body: string | null | undefined): string | null {
  if (!body?.startsWith(GIPHY_MESSAGE_PREFIX)) return null;
  const candidate = body.slice(GIPHY_MESSAGE_PREFIX.length);
  try {
    const url = new URL(candidate);
    if (url.protocol !== 'https:' || !(url.hostname === 'giphy.com' || url.hostname.endsWith('.giphy.com'))) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function giphyMessageBody(url: string): string {
  const safeUrl = getGiphyMessageUrl(`${GIPHY_MESSAGE_PREFIX}${url}`);
  if (!safeUrl) throw new Error('Invalid GIPHY media URL');
  return `${GIPHY_MESSAGE_PREFIX}${safeUrl}`;
}

let configured = false;

export async function getGiphyDialog() {
  const apiKey = Platform.OS === 'android'
    ? process.env.EXPO_PUBLIC_GIPHY_ANDROID_SDK_KEY?.trim()
    : Platform.OS === 'ios'
      ? process.env.EXPO_PUBLIC_GIPHY_IOS_SDK_KEY?.trim()
      : '';
  if (!apiKey) return null;

  const sdk = await import('@giphy/react-native-sdk');
  if (!configured) {
    sdk.GiphySDK.configure({ apiKey });
    sdk.GiphyDialog.configure({
      mediaTypeConfig: [sdk.GiphyContentType.Emoji, sdk.GiphyContentType.Gif],
      selectedContentType: sdk.GiphyContentType.Emoji,
      rating: sdk.GiphyRating.PG13,
    });
    configured = true;
  }
  return { dialog: sdk.GiphyDialog, mediaSelectedEvent: sdk.GiphyDialogEvent.MediaSelected };
}
