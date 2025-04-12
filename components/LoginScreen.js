import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, Alert, Image } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isBiometricAvailable, setIsBiometricAvailable] = useState(false);
  const [hasLoggedBefore, setHasLoggedBefore] = useState(false);

  useEffect(() => {
    checkPreviousLogin();
    checkBiometricAvailability();
  }, []);

  const checkPreviousLogin = async () => {
    const loggedBefore = await AsyncStorage.getItem('hasLoggedBefore');
    if (loggedBefore === 'true') {
      setHasLoggedBefore(true);
    }
  };

  const checkBiometricAvailability = async () => {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    setIsBiometricAvailable(hasHardware);
  };

  const handleLogin = async () => {
    try {
      const savedData = await AsyncStorage.getItem('userCredentials');
      const parsedData = savedData ? JSON.parse(savedData) : null;
  
      if (parsedData && email === parsedData.email && password === parsedData.password) {
        await AsyncStorage.setItem('hasLoggedBefore', 'true');
        navigation.navigate('DeliveryList');
      } else {
        Alert.alert('Erro', 'Email ou senha incorretos');
      }
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível acessar os dados');
    }
  };

  const handleBiometricAuth = async () => {
    try {
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (!isEnrolled) {
        Alert.alert('Erro', 'Nenhuma biometria configurada no dispositivo.');
        return;
      }

      const { success } = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Autentique-se para acessar',
        fallbackLabel: 'Usar senha',
      });

      if (success) {
        navigation.navigate('DeliveryList');
      }
    } catch (error) {
      Alert.alert('Erro', 'Falha na autenticação biométrica');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Image
          source={require('../assets/logo.png')}
          style={styles.logo}
        />
        <Text style={styles.title}>DeliveryCheck</Text>
        <Text style={styles.subtitle}>Gestão de Entregas</Text>
      </View>

      <View style={styles.formContainer}>
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#999"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <TextInput
          style={styles.input}
          placeholder="Senha"
          placeholderTextColor="#999"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />


        <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
          <Text style={styles.loginButtonText}>Entrar</Text>
        </TouchableOpacity>

        {isBiometricAvailable && !hasLoggedBefore && (
        <Text style={styles.biometricNote}>
          *Para ativar o login por biometria, é necessário fazer login com e-mail e senha e reiniciar o aplicativo.*
        </Text>
        )}

        {isBiometricAvailable && hasLoggedBefore && (
          <TouchableOpacity
            style={styles.biometricButton}
            onPress={handleBiometricAuth}
          >
            <Ionicons name="finger-print" size={24} color="#6C5CE7" />
            <Text style={styles.biometricButtonText}>Entrar com Biometria</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity onPress={() => navigation.navigate('Register')}>
          <Text style={styles.registerText}>Não tem uma conta? Cadastre-se</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: '#0F0E0E',
    padding: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#BDBDBD',
  },
  formContainer: {
    width: '100%',
  },
  input: {
    backgroundColor: '#1E1E1E',
    color: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    fontSize: 16,
  },
  loginButton: {
    backgroundColor: '#6C5CE7',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  biometricButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  biometricButtonText: {
    color: '#6C5CE7',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
  },
  logo: {
    width: 80,
    height: 80,
    resizeMode: 'contain',
  },
  biometricNote: {
    color: '#f55858',
    fontSize: 12,
    margin: 16,
    textAlign: 'center',
  },
  registerText: {
    color: '#6C5CE7',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    textDecorationLine: 'underline',
  }
});

export default LoginScreen;
