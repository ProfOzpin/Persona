import { StyleSheet, View, Image, TouchableOpacity, Text } from 'react-native';

import { HelloWave } from '@/components/HelloWave';
import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Link } from 'expo-router';

// Define your navigation types
type RootStackParamList = {
  Welcome: undefined;
  Home: undefined; // Changed from 'Main' to 'Home' to match your usage
};

type NavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

export default function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();

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
    marginBottom: 0, // Reduced from 30 to 20
  },
  subtitle: {
    fontSize: 18,
    color: 'white',
    marginBottom: 80, // Reduced from 40 to 20
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