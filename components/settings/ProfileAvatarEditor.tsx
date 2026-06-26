import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Alert } from 'react-native';
import { Camera } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';

interface ProfileAvatarEditorProps {
  /** Current avatar to show — a remote URL or a freshly-picked local uri. */
  imageUri?: string | null;
  /** Shown when there's no image. */
  fallbackInitial: string;
  onPicked: (asset: { uri: string; base64: string }) => void;
}

/** Centered avatar with a camera badge that opens the image picker (square crop). */
export default function ProfileAvatarEditor({
  imageUri,
  fallbackInitial,
  onPicked,
}: ProfileAvatarEditorProps) {
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true,
    });

    if (result.canceled) return;
    const asset = result.assets?.[0];
    if (!asset?.base64) {
      Alert.alert('Could not load image', 'Please try a different photo.');
      return;
    }
    onPicked({ uri: asset.uri, base64: asset.base64 });
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.avatarWrap} onPress={pickImage} activeOpacity={0.85}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.placeholder]}>
            <Text style={styles.initial}>{fallbackInitial.toUpperCase()}</Text>
          </View>
        )}
        <View style={styles.badge}>
          <Camera size={16} color="#FFFFFF" />
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  avatarWrap: {
    width: 108,
    height: 108,
  },
  avatar: {
    width: 108,
    height: 108,
    borderRadius: 54,
    backgroundColor: '#F2F2F7',
  },
  placeholder: {
    backgroundColor: '#1C1C1E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: {
    fontSize: 42,
    fontFamily: 'OtomanopeeOne-Regular',
    color: '#FFFFFF',
  },
  badge: {
    position: 'absolute',
    right: 2,
    bottom: 2,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#1C1C1E',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
});
