import { Image, type ImageStyle, type StyleProp } from 'react-native';

import { useAppTheme } from '@/theme/theme-provider';

type AppLogoProps = {
  style?: StyleProp<ImageStyle>;
};

export function AppLogo({ style }: AppLogoProps) {
  const { themeName } = useAppTheme();

  return (
    <Image
      accessibilityLabel="Matheus Queiroz"
      resizeMode="contain"
      source={
        themeName === 'dark'
          ? require('../../assets/brand/logo-dark.png')
          : require('../../assets/brand/logo-light.png')
      }
      style={style}
    />
  );
}
