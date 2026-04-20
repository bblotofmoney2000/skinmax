import * as ImageManipulator from "expo-image-manipulator";
import * as FileSystem from "expo-file-system";
import { Platform } from "react-native";

const MAX_DIMENSION = 768;

export async function compressImage(uri: string): Promise<{ uri: string; base64: string }> {
  console.log("=== COMPRESSING IMAGE ===");
  console.log("Input URI:", uri?.substring(0, 100));

  const manipulated = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: MAX_DIMENSION } }],
    { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true }
  );

  console.log("Compressed image URI:", manipulated.uri?.substring(0, 100));
  console.log("Compressed dimensions:", manipulated.width, "x", manipulated.height);

  let base64Data = manipulated.base64 ?? null;

  if (!base64Data && Platform.OS !== "web") {
    base64Data = await FileSystem.readAsStringAsync(manipulated.uri, {
      encoding: "base64",
    });
  }

  if (!base64Data && Platform.OS === "web" && manipulated.uri.startsWith("data:")) {
    const match = manipulated.uri.match(/^data:image\/\w+;base64,(.+)$/);
    if (match) {
      base64Data = match[1];
    }
  }

  if (!base64Data) {
    throw new Error("Failed to get base64 from compressed image");
  }

  console.log("Compressed base64 length:", base64Data.length);
  return { uri: manipulated.uri, base64: base64Data };
}
