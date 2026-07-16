import React from 'react';
import { Provider } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { store } from './store';
import { StatusBar } from 'expo-status-bar';

// Screens
import LoginScreen from './screens/LoginScreen';
import HomeScreen from './screens/HomeScreen';
import ProductDetailsScreen from './screens/ProductDetailsScreen';
import CartScreen from './screens/CartScreen';
import ProfileScreen from './screens/ProfileScreen';

const Stack = createStackNavigator();

export default function App() {
  return (
    <Provider store={store}>
      <NavigationContainer>
        <StatusBar style="light" />
        <Stack.Navigator
          initialRouteName="Home"
          screenOptions={{
            headerStyle: {
              backgroundColor: '#1E1E24',
            },
            headerTintColor: '#FFFFFF',
            headerTitleStyle: {
              fontWeight: 'bold',
            },
            cardStyle: {
              backgroundColor: '#121214',
            },
          }}
        >
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'Raj Store' }} />
          <Stack.Screen name="ProductDetails" component={ProductDetailsScreen} options={{ title: 'Paint Details' }} />
          <Stack.Screen name="Cart" component={CartScreen} options={{ title: 'Your Shopping Cart' }} />
          <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: 'Settings' }} />
        </Stack.Navigator>
      </NavigationContainer>
    </Provider>
  );
}
