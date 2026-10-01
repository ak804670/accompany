/// <reference types="nativewind/types" />
/// <reference types="jest" />

declare module '*.css';
declare module '*.png' {
  const value: import('react-native').ImageSourcePropType;
  export default value;
}
declare module '*.jpg' {
  const value: import('react-native').ImageSourcePropType;
  export default value;
}
