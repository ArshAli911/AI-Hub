import React from 'react';
import { Image, StyleSheet, View } from 'react-native';

interface AvatarProps {
  imageUrl?: string;
  size?: number;
}

const Avatar: React.FC<AvatarProps> = ({ imageUrl, size = 50 }) => {
  const avatarStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
  };

  return (
    <View style={[styles.container, avatarStyle]}>
      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={[styles.image, avatarStyle]} />
      ) : (
        <View style={[styles.placeholder, avatarStyle]}>
          {/* You can add a placeholder icon or text here */}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    backgroundColor: '#ccc', // Placeholder background color
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    resizeMode: 'cover',
  },
  placeholder: {
    backgroundColor: '#eee', // Fallback background color
  },
});

export default Avatar; 