import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  StyleSheet, 
  TouchableOpacity, 
  Modal, 
  TextInput, 
  Image, 
  Alert, 
  ActivityIndicator,
  ScrollView
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import axios from 'axios';

const ensurePhotosDirExists = async () => {
  const photosDir = `${FileSystem.documentDirectory}delivery_photos/`;
  const dirInfo = await FileSystem.getInfoAsync(photosDir);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(photosDir, { intermediates: true });
  }
};

const initialDeliveries = [
  { 
    id: '1', 
    address: 'Rua das Flores, 123 - Jardim Paulista, São Paulo - SP, 01415-000', 
    latitude: -23.5675, 
    longitude: -46.6523, 
    status: 'pending' 
  },
  { 
    id: '2', 
    address: 'Avenida Paulista, 1000 - Bela Vista, São Paulo - SP, 01310-000', 
    latitude: -23.5615, 
    longitude: -46.6553, 
    status: 'completed',
    photo: 'https://example.com/photo.jpg' 
  },
];

const DeliveryListScreen = ({ navigation }) => {

  const [location, setLocation] = useState(null);
  const [deliveries, setDeliveries] = useState(initialDeliveries);
  const [activeTab, setActiveTab] = useState('pending');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  

  const [newDelivery, setNewDelivery] = useState({
    street: '',
    number: '',
    neighborhood: '',
    city: '',
    state: '',
    postalCode: '',
    complement: '',
    latitude: null,
    longitude: null
  });

  useEffect(() => {
    (async () => {
      await ensurePhotosDirExists();
      
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        alert('Permissão para acessar localização negada');
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      setLocation(location.coords);
    })();
  }, []);

  const filteredDeliveries = deliveries.filter(delivery => 
    activeTab === 'pending' ? delivery.status === 'pending' : delivery.status === 'completed'
  );

  const formatAddress = () => {
    const { street, number, neighborhood, city, state, postalCode, complement } = newDelivery;
    let address = `${street}, ${number}`;
    if (complement) address += ` (${complement})`;
    address += ` - ${neighborhood}, ${city} - ${state}`;
    if (postalCode) address += `, ${postalCode.replace('-', '')}`;
    return address;
  };

  const fetchCoordinates = async () => {
    try {
      setIsSearching(true);
      const fullAddress = formatAddress();
      
      const API_KEY = 'API_KEY'; 
      
      const response = await axios.get(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(fullAddress)}&key=${API_KEY}`
      );
  
      if (response.data && response.data.results && response.data.results.length > 0) {
        const { lat, lng } = response.data.results[0].geometry.location;
        return { 
          latitude: lat,
          longitude: lng
        };
      }
      return null;
    } catch (error) {
      console.error('Erro na geocodificação:', error);
      throw error;
    } finally {
      setIsSearching(false);
    }
  };
  
  const handleAddDelivery = async () => {
    if (!newDelivery.street || !newDelivery.number || !newDelivery.neighborhood || 
        !newDelivery.city || !newDelivery.state) {
      Alert.alert('Atenção', 'Preencha todos os campos obrigatórios');
      return;
    }
  
    try {
      setIsLoading(true);
      
      if (!newDelivery.latitude) {
        const coords = await fetchCoordinates();
        if (!coords) {
          Alert.alert('Erro', 'Google Maps não conseguiu encontrar este endereço');
          return;
        }
        setNewDelivery(prev => ({ ...prev, ...coords }));
      }
  
      const delivery = {
        id: Date.now().toString(),
        address: formatAddress(),
        latitude: newDelivery.latitude,
        longitude: newDelivery.longitude,
        status: 'pending'
      };
  
      setDeliveries([...deliveries, delivery]);
      
      setIsModalVisible(false);
      setNewDelivery({
        street: '',
        number: '',
        neighborhood: '',
        city: '',
        state: '',
        postalCode: '',
        complement: '',
        latitude: null,
        longitude: null
      });
    } catch (error) {
      Alert.alert('Erro', 'Ocorreu um erro ao adicionar a entrega');
    } finally {
      setIsLoading(false);
    }
  };

  const savePhotoForDelivery = async (deliveryId, photoUri) => {
    try {
      await ensurePhotosDirExists();
      
      const fileName = `delivery_${deliveryId}.jpg`;
      const filePath = `${FileSystem.documentDirectory}delivery_photos/${fileName}`;
      
      const fileInfo = await FileSystem.getInfoAsync(filePath);
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(filePath);
      }
      
      await FileSystem.copyAsync({
        from: photoUri,
        to: filePath,
      });
      
      return filePath;
    } catch (error) {
      console.error('Erro ao salvar a foto:', error);
      throw error;
    }
  };

  const renderDeliveryItem = ({ item }) => (
    <TouchableOpacity 
      style={[
        styles.deliveryItem,
        item.status === 'completed' && styles.completedItem
      ]}
      onPress={() => navigation.navigate('DeliveryCheck', { 
        delivery: item,
        onComplete: async (photoUri) => {
          try {
            let photoPath = null;
            if (photoUri) {
              photoPath = await savePhotoForDelivery(item.id, photoUri);
            }
            
            setDeliveries(deliveries.map(d => 
              d.id === item.id ? { 
                ...d, 
                status: 'completed',
                photo: photoPath || d.photo
              } : d
            ));
          } catch (error) {
            Alert.alert('Erro', 'Não foi possível salvar a foto da entrega');
          }
        }
      })}
      activeOpacity={0.8}
    >
      <View style={styles.deliveryInfo}>
        <Ionicons 
          name={item.status === 'pending' ? 'time' : 'checkmark-circle'} 
          size={24} 
          color={item.status === 'pending' ? '#FFA502' : '#2ECC71'} 
        />
        <View style={styles.deliveryTextContainer}>
          <Text style={styles.deliveryAddress}>{item.address}</Text>
          <Text style={styles.deliveryStatus}>
            Status: <Text style={[styles.statusText, { color: item.status === 'pending' ? '#FFA502' : '#2ECC71' }]}>
              {item.status === 'pending' ? 'Pendente' : 'Entregue'}
            </Text>
          </Text>
        </View>
      </View>
      
      {item.status === 'completed' && item.photo && (
        <Image 
          source={{ uri: item.photo }} 
          style={styles.deliveryPhoto}
        />
      )}
      
      <Ionicons 
        name="chevron-forward" 
        size={24} 
        color={item.status === 'pending' ? '#BDBDBD' : '#2ECC71'} 
      />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Abas de filtro */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'pending' && styles.activeTab]}
          onPress={() => setActiveTab('pending')}
        >
          <Text style={[styles.tabText, activeTab === 'pending' && styles.activeTabText]}>Pendentes</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'completed' && styles.activeTab]}
          onPress={() => setActiveTab('completed')}
        >
          <Text style={[styles.tabText, activeTab === 'completed' && styles.activeTabText]}>Concluídas</Text>
        </TouchableOpacity>
      </View>

      {/* Lista de entregas */}
      <FlatList
        data={filteredDeliveries}
        keyExtractor={(item) => item.id}
        renderItem={renderDeliveryItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons 
              name={activeTab === 'pending' ? 'time-outline' : 'checkmark-done-outline'} 
              size={48} 
              color="#6C5CE7" 
            />
            <Text style={styles.emptyText}>
              {activeTab === 'pending' ? 'Nenhuma entrega pendente' : 'Nenhuma entrega concluída'}
            </Text>
          </View>
        }
      />

      {/* Botão flutuante para adicionar */}
      <TouchableOpacity 
        style={styles.addButton}
        onPress={() => setIsModalVisible(true)}
      >
        <Ionicons name="add" size={24} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Modal de adição de entrega */}
      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Adicionar Nova Entrega</Text>
              <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                <Ionicons name="close" size={24} color="#BDBDBD" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formContainer}>
              {/* Logradouro */}
              <Text style={styles.inputLabel}>Logradouro*</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Rua/Avenida"
                value={newDelivery.street}
                onChangeText={(text) => setNewDelivery({...newDelivery, street: text})}
              />

              {/* Número e Complemento */}
              <View style={styles.rowInputContainer}>
                <View style={styles.halfInput}>
                  <Text style={styles.inputLabel}>Número*</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="Número"
                    keyboardType="numeric"
                    value={newDelivery.number}
                    onChangeText={(text) => setNewDelivery({...newDelivery, number: text})}
                  />
                </View>
                <View style={styles.halfInput}>
                  <Text style={styles.inputLabel}>Complemento</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="Apto/Casa"
                    value={newDelivery.complement}
                    onChangeText={(text) => setNewDelivery({...newDelivery, complement: text})}
                  />
                </View>
              </View>

              {/* Bairro */}
              <Text style={styles.inputLabel}>Bairro*</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Bairro"
                value={newDelivery.neighborhood}
                onChangeText={(text) => setNewDelivery({...newDelivery, neighborhood: text})}
              />

              {/* Cidade e Estado */}
              <View style={styles.rowInputContainer}>
                <View style={styles.twoThirdsInput}>
                  <Text style={styles.inputLabel}>Cidade*</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="Cidade"
                    value={newDelivery.city}
                    onChangeText={(text) => setNewDelivery({...newDelivery, city: text})}
                  />
                </View>
                <View style={styles.oneThirdInput}>
                  <Text style={styles.inputLabel}>UF*</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="SP"
                    maxLength={2}
                    value={newDelivery.state}
                    onChangeText={(text) => setNewDelivery({...newDelivery, state: text.toUpperCase()})}
                  />
                </View>
              </View>

              {/* CEP */}
              <Text style={styles.inputLabel}>CEP</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="00000-000"
                keyboardType="numeric"
                value={newDelivery.postalCode}
                onChangeText={(text) => {
                  const formattedText = text.replace(/\D/g, '');
                  if (formattedText.length <= 5) {
                    setNewDelivery({...newDelivery, postalCode: formattedText});
                  } else if (formattedText.length <= 8) {
                    setNewDelivery({...newDelivery, postalCode: `${formattedText.slice(0, 5)}-${formattedText.slice(5)}`});
                  }
                }}
                maxLength={9}
              />

              {/* Mapa de visualização */}
              {newDelivery.latitude && newDelivery.longitude && (
                <View style={styles.mapPreview}>
                  <Text style={styles.inputLabel}>Localização Encontrada:</Text>
                  <MapView
                    style={styles.map}
                    initialRegion={{
                      latitude: newDelivery.latitude,
                      longitude: newDelivery.longitude,
                      latitudeDelta: 0.01,
                      longitudeDelta: 0.01,
                    }}
                    scrollEnabled={false}
                  >
                    <Marker
                      coordinate={{
                        latitude: newDelivery.latitude,
                        longitude: newDelivery.longitude,
                      }}
                    />
                  </MapView>
                </View>
              )}

              {/* Botão para verificar endereço */}
              <TouchableOpacity 
                style={styles.searchButton}
                onPress={async () => {
                  try {
                    const coords = await fetchCoordinates();
                    if (coords) {
                      setNewDelivery({
                        ...newDelivery,
                        latitude: coords.latitude,
                        longitude: coords.longitude
                      });
                      Alert.alert('Sucesso', 'Endereço verificado com sucesso!');
                    } else {
                      Alert.alert('Atenção', 'Não foi possível encontrar este endereço');
                    }
                  } catch (error) {
                    Alert.alert('Erro', 'Ocorreu um erro ao buscar o endereço');
                  }
                }}
                disabled={isSearching || !newDelivery.street || !newDelivery.number || 
                          !newDelivery.neighborhood || !newDelivery.city || !newDelivery.state}
              >
                {isSearching ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.searchButtonText}>Verificar Endereço</Text>
                )}
              </TouchableOpacity>
            </ScrollView>

            {/* Botões de ação */}
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setIsModalVisible(false)}
              >
                <Text style={styles.modalButtonText}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleAddDelivery}
                disabled={isLoading || !newDelivery.latitude}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalButtonText}>Adicionar Entrega</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0E0E',
    paddingTop: 20,
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 10,
    backgroundColor: '#1E1E1E',
    borderRadius: 10,
    overflow: 'hidden',
    elevation: 3,
  },
  tabButton: {
    flex: 1,
    padding: 14,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#6C5CE7',
  },
  tabText: {
    color: '#BDBDBD',
    fontWeight: '600',
    fontSize: 14,
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  deliveryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FFA502',
  },
  completedItem: {
    borderLeftColor: '#2ECC71',
  },
  deliveryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  deliveryTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  deliveryAddress: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  deliveryStatus: {
    color: '#BDBDBD',
    fontSize: 14,
    marginTop: 4,
  },
  statusText: {
    fontWeight: '600',
  },
  deliveryPhoto: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 60,
  },
  emptyText: {
    color: '#BDBDBD',
    textAlign: 'center',
    marginTop: 16,
    fontSize: 16,
    maxWidth: '80%',
  },
  addButton: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    backgroundColor: '#6C5CE7',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
  },
  formContainer: {
    marginBottom: 15,
  },
  inputLabel: {
    color: '#BDBDBD',
    marginBottom: 5,
    fontWeight: '500',
    fontSize: 14,
  },
  modalInput: {
    backgroundColor: '#2D3436',
    color: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    fontSize: 16,
  },
  rowInputContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfInput: {
    width: '48%',
  },
  twoThirdsInput: {
    width: '65%',
  },
  oneThirdInput: {
    width: '30%',
  },
  mapPreview: {
    height: 200,
    borderRadius: 10,
    overflow: 'hidden',
    marginVertical: 10,
  },
  map: {
    flex: 1,
  },
  searchButton: {
    backgroundColor: '#6C5CE7',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 10,
  },
  searchButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  modalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#2D3436',
  },
  confirmButton: {
    backgroundColor: '#6C5CE7',
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
});

export default DeliveryListScreen;