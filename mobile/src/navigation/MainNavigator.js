import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import TabNavigator from './TabNavigator';
import DisclaimerModal from '../components/common/DisclaimerModal';
import { darkTheme } from '../constants/theme';

const Stack = createNativeStackNavigator();

export default function MainNavigator() {
  return (
    <>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: darkTheme.colors.background },
        }}
      >
        <Stack.Screen name="Tabs" component={TabNavigator} />
      </Stack.Navigator>
      <DisclaimerModal />
    </>
  );
}

