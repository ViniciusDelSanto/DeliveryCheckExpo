import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import LoginScreen from './components/LoginScreen';
import DeliveryListScreen from './components/DeliveryListScreen';
import DeliveryCheckScreen from './components/DeliveryCheckScreen';
import RegisterScreen from './components/RegisterScreen';

const Stack = createStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Login"
        screenOptions={{
          headerStyle: {
            backgroundColor: '#1E1E1E', 
            elevation: 0,
            shadowOpacity: 0, 
          },
          headerTintColor: '#FFFFFF', 
          headerTitleStyle: {
            fontWeight: '600',
            fontSize: 18,
          },
          headerBackTitleVisible: false, 
        }}
      >
        <Stack.Screen 
          name="Login" 
          component={LoginScreen}
          options={{ headerShown: false }}
        />

        <Stack.Screen 
          name="Register" 
          component={RegisterScreen} 
          options={{ headerShown: false }} 
        />
        
        <Stack.Screen 
          name="DeliveryList" 
          component={DeliveryListScreen}
          options={({ navigation }) => ({
            title: 'Minhas Entregas',
            headerRight: () => (
              <TouchableOpacity 
                onPress={() => navigation.navigate('AddDelivery')} 
                style={{ marginRight: 15 }}
              >
              </TouchableOpacity>
            ),
          })}
        />
        
        <Stack.Screen 
          name="DeliveryCheck" 
          component={DeliveryCheckScreen}
          options={{ 
            title: 'Verificar Entrega',
            headerLeft: ({ onPress }) => (
              <TouchableOpacity onPress={onPress} style={{ marginLeft: 15 }}>
                <Ionicons name="arrow-back" size={24} color="#6C5CE7" />
              </TouchableOpacity>
            ),
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}