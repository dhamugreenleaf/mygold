import React from 'react';
import { View, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import HomeScreen from '../screens/main/HomeScreen';
import MyGoldScreen from '../screens/main/MyGoldScreen';
import AddGoldScreen from '../screens/main/AddGoldScreen';
import ProfileScreen from '../screens/main/ProfileScreen';
import MoreScreen from '../screens/main/MoreScreen';
import { darkTheme } from '../constants/theme';

const Tab = createBottomTabNavigator();

const tabIcons = {
  Home: 'home',
  MyGold: 'shield',
  Profile: 'user',
  More: 'trending-up',
};

export default function TabNavigator() {
  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, size, focused }) => {
          const iconName = tabIcons[route.name] || 'circle';
          return <Feather name={iconName} size={focused ? 22 : 20} color={color} />;
        },
        tabBarActiveTintColor: '#F59E0B',
        tabBarInactiveTintColor: '#64748B',
        tabBarStyle: {
          backgroundColor: '#090D16',
          borderTopColor: 'rgba(255, 191, 0, 0.15)',
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 84 : 68,
          paddingBottom: Platform.OS === 'ios' ? 24 : 10,
          paddingTop: 8,
          elevation: 10,
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
        },
        tabBarLabelStyle: {
          fontSize: 10.5,
          fontWeight: '700',
          marginTop: 2,
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarLabel: 'Home' }} />
      <Tab.Screen name="MyGold" component={MyGoldScreen} options={{ tabBarLabel: 'Vault' }} />
      
      {/* Signature Floating Metallic Gold Center Button Matching Website */}
      <Tab.Screen
        name="AddGold"
        component={AddGoldScreen}
        options={{
          tabBarLabel: () => null,
          tabBarButton: (props) => (
            <TouchableOpacity
              {...props}
              style={[props.style, styles.floatingButtonWrapper]}
              activeOpacity={0.88}
              accessibilityRole="button"
              accessibilityLabel="Add new gold or silver asset"
            >
              <LinearGradient
                colors={['#FDE68A', '#F59E0B', '#B45309']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.floatingButtonInner}
              >
                <Feather name="plus" size={26} color="#080B12" />
              </LinearGradient>
            </TouchableOpacity>
          ),
        }}
      />

      <Tab.Screen name="More" component={MoreScreen} options={{ tabBarLabel: 'Rates' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarLabel: 'Profile' }} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  floatingButtonWrapper: {
    top: -16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  floatingButtonInner: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3.5,
    borderColor: '#080B12',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 8,
  },
});
