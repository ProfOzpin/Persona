import { StyleSheet, View, Image, TouchableOpacity } from 'react-native';


export default function HomeScreen() {
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

      {/* Main Content */}
      <View style={styles.content}>
        {/* Your existing content here */}
      </View>

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

      {/* New Floating Action Button */}
      <TouchableOpacity 
        style={styles.fab}
        onPress={() => console.log('New Message pressed')}
      >
        <Image
          source={require('@/assets/icons/new-message-icon.png')} // Add your icon
          style={styles.fabIcon}
        />
      </TouchableOpacity>
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
  fab: {
    position: 'absolute',
    bottom: 70, // Adjust based on your bottom bar height
    right: 20,
    backgroundColor: 'white',
    borderRadius: 30,
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  fabIcon: {
    width: 30,
    height: 30,
    resizeMode: 'contain',
  },
});