import { StyleSheet, View, Image, TouchableOpacity } from 'react-native';

export default function NewScreen() {
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Image
          source={require('@/assets/images/logo.png')}
          style={styles.logo}
        />
        <TouchableOpacity>
          <Image
            source={require('@/assets/icons/menu-icon.png')}
            style={styles.menuIcon}
          />
        </TouchableOpacity>
      </View>

      {/* Main Content - Add your content here */}
      <View style={styles.content}></View>

      {/* Bottom Navigation Bar */}
      <View style={styles.bottomBar}>
        <TouchableOpacity>
          <Image
            source={require('@/assets/icons/messages-icon.png')}
            style={styles.navIcon}
          />
        </TouchableOpacity>
        <TouchableOpacity>
          <Image
            source={require('@/assets/icons/journal-icon.png')}
            style={styles.navIcon}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#231f20',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  logo: {
    width: 120,
    height: 40,
    resizeMode: 'contain',
  },
  menuIcon: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
  },
  content: {
    flex: 1,
  },
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 60,
    backgroundColor: 'white',
    paddingHorizontal: 30,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  navIcon: {
    width: 32,
    height: 32,
    resizeMode: 'contain',
  },
});