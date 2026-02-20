import React, { useEffect } from "react";
import { Alert } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ThemeProvider, useTheme } from "@/theme/ThemeProvider";
import AppNavigation from "@/navigation";
import * as Updates from "expo-updates";

const AppContent = () => {
  const { dark } = useTheme();
  return (
    <>
      <StatusBar style={dark ? "light" : "dark"} />
      <AppNavigation />
    </>
  );
};

async function checkForOTAUpdate() {
  if (__DEV__) return;

  try {
    const { isAvailable } = await Updates.checkForUpdateAsync();

    if (!isAvailable) return;

    const { isNew } = await Updates.fetchUpdateAsync();

    if (!isNew) return;

    Alert.alert(
      "Atualização disponível",
      "Uma nova versão foi baixada. Deseja reiniciar o app agora para aplicá-la?",
      [
        { text: "Agora não", style: "cancel" },
        {
          text: "Reiniciar",
          onPress: () => {
            Updates.reloadAsync().catch((err) =>
              console.warn("Falha ao reiniciar após atualização", err),
            );
          },
        },
      ],
      { cancelable: true },
    );
  } catch (err: unknown) {
    console.log("Verificação de atualização falhou (não-fatal):", err);
  }
}

export default function App() {
  useEffect(() => {
    checkForOTAUpdate();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AppContent />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
