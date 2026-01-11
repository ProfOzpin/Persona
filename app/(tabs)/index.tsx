import { StyleSheet, View, Image, TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import { Link } from 'expo-router';
import { useEffect, useState } from 'react';
import { initializeDatabase } from '@/lib/database';
import { initializeSchema } from '@/lib/schema';

export default function HomeScreen() {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function initApp() {
      try {
        const db = await initializeDatabase();
        await initializeSchema(db);
        setIsReady(true);
      } catch (err) {
        console.error('App initialization failed:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      }
    }

    initApp();
  }, []);

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={{ color: 'red', textAlign: 'center', padding: 20 }}>
          Failed to initialize app: {error}
        </Text>
      </View>
    );
  }

  if (!isReady) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#ffffff" />
        <Text style={{ color: 'white', marginTop: 20 }}>Initializing...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Image
        source={require('@/assets/images/logo.png')}
        style={styles.logo}
      />
      <Text style={styles.subtitle}>Self-help through texting</Text>

      <View style={styles.textContainer}>
        <Text style={styles.descriptionLine}>Talk with your</Text>
        <Text style={styles.descriptionLine}>unique Personas</Text>
        <Text style={styles.descriptionLine}>and clear your mind</Text>
      </View>

      <Link href="/(tabs)/home" asChild>
        <TouchableOpacity style={styles.welcomeButton}>
          <Text style={styles.buttonText}>Welcome</Text>
        </TouchableOpacity>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#231f20',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  logo: {
    width: 250,
    height: 100,
    resizeMode: 'contain',
    marginBottom: 0,
  },
  subtitle: {
    fontSize: 18,
    color: 'white',
    marginBottom: 80,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 80,
  },
  descriptionLine: {
    fontSize: 24,
    color: 'white',
    lineHeight: 36,
  },
  welcomeButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 15,
    paddingHorizontal: 50,
    borderRadius: 30,
  },
  buttonText: {
    color: 'black',
    fontSize: 20,
  },
});