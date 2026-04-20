import { CameraView, useCameraPermissions } from "expo-camera";
import * as FileSystem from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import { router, useFocusEffect } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { ScanFace, X, Camera, ImagePlus } from "lucide-react-native";
import React, { useRef, useState, useCallback } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { compressImage } from "@/lib/compressImage";
import { useTranslation } from "@/constants/useTranslation";
import { useScanLimit } from "@/contexts/ScanLimitContext";
import { COLORS } from "@/constants/colors";

const { width } = Dimensions.get("window");

export default function CameraScreen() {
  const t = useTranslation();
  const { canScan, storePendingImage, storeAnalysisImage } = useScanLimit();
  const [permission, requestPermission] = useCameraPermissions();
  const [isCapturing, setIsCapturing] = useState(false);
  
  const cameraRef = useRef<CameraView>(null);

  useFocusEffect(
    useCallback(() => {
      setIsCapturing(false);
    }, [])
  );

  const scanLineAnim = React.useRef(new Animated.Value(0)).current;
  const pulseAnim = React.useRef(new Animated.Value(1)).current;
  const cornerAnim = React.useRef(new Animated.Value(1)).current;
  const breatheAnim = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineAnim, {
          toValue: 1,
          duration: 2500,
          useNativeDriver: true,
        }),
        Animated.timing(scanLineAnim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.02,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(cornerAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(cornerAnim, {
          toValue: 0.6,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(breatheAnim, {
          toValue: 1.06,
          duration: 2500,
          useNativeDriver: true,
        }),
        Animated.timing(breatheAnim, {
          toValue: 1,
          duration: 2500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [scanLineAnim, pulseAnim, cornerAnim, breatheAnim]);

  if (!permission) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingDot} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[COLORS.taupe[100], COLORS.taupe[200]]}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.permissionContainer}>
          <View style={styles.permissionIcon}>
            <Camera size={48} color={COLORS.taupe[800]} strokeWidth={1.5} />
          </View>
          <Text style={styles.permissionTitle}>{t.camera.cameraAccess}</Text>
          <Text style={styles.permissionText}>
            {t.camera.permissionText}
          </Text>
          <Pressable
            onPress={requestPermission}
            style={({ pressed }) => [
              styles.permissionButton,
              pressed && { opacity: 0.8 },
            ]}
          >
            <LinearGradient
              colors={[COLORS.taupe[800], COLORS.taupe[900]]}
              style={styles.permissionButtonGradient}
            >
              <Text style={styles.permissionButtonText}>{t.camera.grantPermission}</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    );
  }

  const takePicture = async () => {
    if (isCapturing) {
      console.log('Already capturing, ignoring tap');
      return;
    }
    
    if (cameraRef.current) {
      setIsCapturing(true);
      
      try {
        console.log('=== TAKING PICTURE ===');
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.8,
          base64: true,
        });
        
        console.log('Photo captured:', {
          uri: photo?.uri?.substring(0, 100),
          hasBase64: !!photo?.base64,
          base64Length: photo?.base64?.length,
        });

        if (photo && photo.uri) {
          console.log('Compressing captured photo...');
          const compressed = await compressImage(photo.uri);

          if (!canScan()) {
            console.log('User cannot scan, storing image and showing paywall');
            storePendingImage(compressed.uri, compressed.base64);
            router.push('/limit-reached');
            return;
          }

          console.log('Storing analysis image with base64 length:', compressed.base64.length);
          storeAnalysisImage(compressed.uri, compressed.base64);
          router.push("/analyzing");
        } else {
          console.error('No photo or URI returned from camera');
        }
      } catch (error) {
        console.error("Error taking picture:", error);
        setIsCapturing(false);
      }
    } else {
      console.error('Camera ref not available');
      setIsCapturing(false);
    }
  };

  const pickImage = async () => {
    if (isCapturing) return;
    setIsCapturing(true);

    try {
      console.log('=== PICKING IMAGE FROM GALLERY ===');
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        console.log('Media library permission denied');
        Alert.alert(
          t.camera.cameraAccess,
          t.camera.galleryPermissionText
        );
        setIsCapturing(false);
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.8,
        base64: true,
      });

      if (result.canceled) {
        console.log('Image pick canceled');
        setIsCapturing(false);
        return;
      }

      const asset = result.assets[0];
      console.log('Compressing picked image...');
      const compressed = await compressImage(asset.uri);

      if (!canScan()) {
        storePendingImage(compressed.uri, compressed.base64);
        router.push('/limit-reached');
        return;
      }

      storeAnalysisImage(compressed.uri, compressed.base64);
      router.push('/analyzing');
    } catch (error) {
      console.error('Error picking image:', error);
      setIsCapturing(false);
    }
  };

  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={styles.camera} facing="front">
        <View style={styles.overlay}>
          <View style={styles.topBar}>
            <Pressable
              onPress={() => router.back()}
              style={styles.closeButton}
              hitSlop={8}
            >
              <X size={24} color="#FFFFFF" strokeWidth={2} />
            </Pressable>
          </View>

          <View style={styles.guideContainer}>
            <View style={styles.instructionBanner}>
              <Animated.View style={[styles.instructionIcon, { transform: [{ scale: breatheAnim }] }]}>
                <ScanFace size={18} color={COLORS.taupe[900]} strokeWidth={2} />
              </Animated.View>
              <View style={styles.instructionTextWrapper}>
                <Text style={styles.instructionTitle}>{t.camera.centerFace}</Text>
                <Text style={styles.instructionSubtitle}>{t.camera.alignGuide}</Text>
              </View>
            </View>

            <Animated.View 
              style={[
                styles.faceGuideWrapper,
                { transform: [{ scale: pulseAnim }] },
              ]}
            >
              <View style={styles.faceGuide}>
                <Animated.View style={[styles.corner, styles.cornerTopLeft, { opacity: cornerAnim }]}>
                  <View style={styles.cornerHorizontal} />
                  <View style={styles.cornerVertical} />
                </Animated.View>
                
                <Animated.View style={[styles.corner, styles.cornerTopRight, { opacity: cornerAnim }]}>
                  <View style={styles.cornerHorizontal} />
                  <View style={styles.cornerVertical} />
                </Animated.View>
                
                <Animated.View style={[styles.corner, styles.cornerBottomLeft, { opacity: cornerAnim }]}>
                  <View style={styles.cornerHorizontal} />
                  <View style={styles.cornerVertical} />
                </Animated.View>
                
                <Animated.View style={[styles.corner, styles.cornerBottomRight, { opacity: cornerAnim }]}>
                  <View style={styles.cornerHorizontal} />
                  <View style={styles.cornerVertical} />
                </Animated.View>
                
                <Animated.View
                  style={[
                    styles.scanLine,
                    {
                      transform: [
                        {
                          translateY: scanLineAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, width * 0.85],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <LinearGradient
                    colors={[
                      "rgba(255, 255, 255, 0)",
                      "rgba(255, 255, 255, 0.5)",
                      "rgba(255, 255, 255, 0.8)",
                      "rgba(255, 255, 255, 0.5)",
                      "rgba(255, 255, 255, 0)"
                    ]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.scanLineGradient}
                  />
                </Animated.View>
              </View>
            </Animated.View>
          </View>

          <View style={styles.bottomBar}>
            <Pressable
              onPress={pickImage}
              disabled={isCapturing}
              style={({ pressed }) => [
                styles.galleryButton,
                pressed && { opacity: 0.7 },
                isCapturing && { opacity: 0.5 },
              ]}
              hitSlop={8}
            >
              <ImagePlus size={22} color="#FFFFFF" strokeWidth={2} />
              <Text style={styles.galleryButtonText}>{t.camera.uploadPhoto}</Text>
            </Pressable>

            <Pressable
              onPress={takePicture}
              disabled={isCapturing}
              style={({ pressed }) => [
                styles.captureButton,
                pressed && { opacity: 0.85 },
                isCapturing && { opacity: 0.5 },
              ]}
            >
              <Animated.View style={[styles.captureButtonOuter, { transform: [{ scale: breatheAnim }] }]}>
                <LinearGradient
                  colors={[COLORS.white, "#F0F0F0"]}
                  style={styles.captureButtonGradient}
                >
                  <View style={styles.captureButtonInner}>
                    <View style={styles.shutterCenter} />
                  </View>
                </LinearGradient>
              </Animated.View>
            </Pressable>

            <View style={styles.galleryButtonPlaceholder} />
          </View>
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },
  camera: {
    flex: 1,
    width: "100%",
  },
  overlay: {
    flex: 1,
    backgroundColor: "transparent",
    justifyContent: "space-between",
  },
  topBar: {
    paddingTop: 60,
    paddingHorizontal: 24,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  guideContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    gap: 40,
  },
  instructionBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 100,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },
  instructionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.taupe[200],
    alignItems: "center",
    justifyContent: "center",
  },
  instructionTextWrapper: {
    gap: 2,
  },
  instructionTitle: {
    color: COLORS.taupe[900],
    fontSize: 14,
    fontWeight: "700",
  },
  instructionSubtitle: {
    color: COLORS.taupe[600],
    fontSize: 12,
    fontWeight: "500",
  },
  faceGuideWrapper: {
    position: "relative",
  },
  faceGuide: {
    width: width * 0.75,
    height: width * 0.95,
    position: "relative",
    borderRadius: 180,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
    borderStyle: "dashed",
    overflow: 'hidden',
  },
  corner: {
    position: "absolute",
    width: 40,
    height: 40,
  },
  cornerHorizontal: {
    position: "absolute",
    width: 40,
    height: 4,
    backgroundColor: "#FFFFFF",
    borderRadius: 2,
  },
  cornerVertical: {
    position: "absolute",
    width: 4,
    height: 40,
    backgroundColor: "#FFFFFF",
    borderRadius: 2,
  },
  cornerTopLeft: {
    top: 0,
    left: 0,
  },
  cornerTopRight: {
    top: 0,
    right: 0,
  },
  cornerBottomLeft: {
    bottom: 0,
    left: 0,
  },
  cornerBottomRight: {
    bottom: 0,
    right: 0,
  },
  scanLine: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 2,
  },
  scanLineGradient: {
    width: "100%",
    height: "100%",
  },
  bottomBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 50,
    paddingHorizontal: 40,
    paddingTop: 20,
  },
  galleryButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(0, 0, 0, 0.35)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    gap: 2,
  },
  galleryButtonText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "600" as const,
    letterSpacing: 0.3,
  },
  galleryButtonPlaceholder: {
    width: 56,
    height: 56,
  },
  captureButton: {
    alignItems: "center",
    justifyContent: "center",
  },
  captureButtonOuter: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
    overflow: "hidden",
  },
  captureButtonGradient: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: "center",
    justifyContent: "center",
  },
  captureButtonInner: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: COLORS.white,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: COLORS.taupe[200],
  },
  shutterCenter: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.taupe[300],
  },
  permissionContainer: {
    paddingHorizontal: 32,
    alignItems: "center",
    gap: 20,
  },
  permissionIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.white,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
    shadowColor: COLORS.taupe[900],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.taupe[900],
    textAlign: "center",
  },
  permissionText: {
    fontSize: 16,
    color: COLORS.taupe[600],
    textAlign: "center",
    lineHeight: 24,
  },
  permissionButton: {
    borderRadius: 30,
    overflow: "hidden",
    shadowColor: COLORS.taupe[900],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
    marginTop: 10,
    width: '100%',
  },
  permissionButtonGradient: {
    paddingVertical: 18,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  permissionButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "700",
  },
  loadingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.taupe[600],
  },
});
