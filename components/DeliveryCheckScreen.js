import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Alert } from 'react-native';
import * as Location from 'expo-location';
import * as FileSystem from 'expo-file-system';
import MapView, { Marker } from 'react-native-maps';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';

const mapStyle = [
  {
    "elementType": "geometry",
    "stylers": [
      { "color": "#212121" }
    ]
  },
  {
    "elementType": "labels.icon",
    "stylers": [
      { "visibility": "off" }
    ]
  },
  {
    "elementType": "labels.text.fill",
    "stylers": [
      { "color": "#757575" }
    ]
  },
  {
    "elementType": "labels.text.stroke",
    "stylers": [
      { "color": "#212121" }
    ]
  },
  {
    "featureType": "administrative",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#757575"
      }
    ]
  },
  {
    "featureType": "administrative.country",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#9e9e9e"
      }
    ]
  },
  {
    "featureType": "administrative.land_parcel",
    "stylers": [
      {
        "visibility": "off"
      }
    ]
  },
  {
    "featureType": "administrative.locality",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#bdbdbd"
      }
    ]
  },
  {
    "featureType": "poi",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#757575"
      }
    ]
  },
  {
    "featureType": "poi.park",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#181818"
      }
    ]
  },
  {
    "featureType": "poi.park",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#616161"
      }
    ]
  },
  {
    "featureType": "poi.park",
    "elementType": "labels.text.stroke",
    "stylers": [
      {
        "color": "#1b1b1b"
      }
    ]
  },
  {
    "featureType": "road",
    "elementType": "geometry.fill",
    "stylers": [
      {
        "color": "#2c2c2c"
      }
    ]
  },
  {
    "featureType": "road",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#8a8a8a"
      }
    ]
  },
  {
    "featureType": "road.arterial",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#373737"
      }
    ]
  },
  {
    "featureType": "road.highway",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#3c3c3c"
      }
    ]
  },
  {
    "featureType": "road.highway.controlled_access",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#4e4e4e"
      }
    ]
  },
  {
    "featureType": "road.local",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#616161"
      }
    ]
  },
  {
    "featureType": "transit",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#757575"
      }
    ]
  },
  {
    "featureType": "water",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#000000"
      }
    ]
  },
  {
    "featureType": "water",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#3d3d3d"
      }
    ]
  }
];
const DeliveryCheckScreen = ({ route, navigation }) => {
  const { delivery, onComplete } = route.params;
  const [location, setLocation] = useState(null);
  const [photoUri, setPhotoUri] = useState(delivery.photo || null);
  const [distance, setDistance] = useState(null);
  const isCompleted = delivery.status === 'completed';

  useEffect(() => {
    (async () => {
      const { status: locationStatus } = await Location.requestForegroundPermissionsAsync();
      if (locationStatus === 'granted') {
        const location = await Location.getCurrentPositionAsync({});
        setLocation(location.coords);
        calculateDistance(location.coords);
      }

      if (!isCompleted) {
        const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
        if (cameraStatus !== 'granted') {
          Alert.alert('Permissão negada', 'Você precisa permitir o acesso à câmera.');
        }
      }
    })();
  }, []);

  const calculateDistance = (userLocation) => {
    if (!userLocation || !delivery) return;
    
    const R = 6371;
    const dLat = toRad(delivery.latitude - userLocation.latitude);
    const dLon = toRad(delivery.longitude - userLocation.longitude);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(toRad(userLocation.latitude)) * Math.cos(toRad(delivery.latitude)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    
    setDistance(distance);
  };

  const toRad = (value) => value * Math.PI / 180;

  const takePicture = async () => {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
      aspect: [4, 3],
    });

    if (!result.canceled && result.assets.length > 0) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const completeDelivery = () => {
    Alert.alert(
      'Confirmar Entrega',
      'Tem certeza que deseja marcar esta entrega como concluída?',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Confirmar',
          onPress: () => {
            onComplete(photoUri);
            navigation.goBack();
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#6C5CE7" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Verificar Entrega</Text>
        <View style={{ width: 24 }} />
      </View> */}

      <View style={styles.card}>
        <Text style={styles.deliveryTitle}>Entrega para:</Text>
        <Text style={styles.deliveryAddress}>{delivery.address}</Text>
        
        <View style={styles.mapContainer}>
          <MapView
            style={styles.map}
            initialRegion={{
              latitude: location?.latitude || delivery.latitude,
              longitude: location?.longitude || delivery.longitude,
              latitudeDelta: 0.005,
              longitudeDelta: 0.005,
            }}
            customMapStyle={mapStyle}
          >
            <Marker
              coordinate={{ latitude: delivery.latitude, longitude: delivery.longitude }}
              title="Local da entrega"
            >
              <View style={styles.marker}>
                <Ionicons name="cube" size={20} color="white" />
              </View>
            </Marker>
            {location && (
              <Marker
                coordinate={{ latitude: location.latitude, longitude: location.longitude }}
                title="Sua localização"
              >
                <View style={styles.userMarker}>
                  <Ionicons name="person" size={14} color="white" />
                </View>
              </Marker>
            )}
          </MapView>
        </View>

        <View style={styles.distanceContainer}>
          <Ionicons name="location" size={20} color="#6C5CE7" />
          <Text style={styles.distanceText}>
            {distance ? `Distância: ${(distance * 1000).toFixed(0)} metros` : 'Calculando distância...'}
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Comprovação de Entrega</Text>
        <Text style={styles.sectionSubtitle}>
          {isCompleted ? 'Foto registrada na entrega' : 'Tire uma foto do pacote no local'}
        </Text>
        
        {photoUri ? (
          <View style={styles.photoContainer}>
            <Image source={{ uri: photoUri }} style={styles.previewImage} />
            {!isCompleted && (
              <TouchableOpacity 
                style={styles.retakeButton}
                onPress={takePicture}
              >
                <Text style={styles.retakeButtonText}>Tirar Nova Foto</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : isCompleted ? (
          <View style={styles.noPhotoContainer}>
            <Ionicons name="camera-off" size={48} color="#BDBDBD" />
            <Text style={styles.noPhotoText}>Nenhuma foto registrada</Text>
          </View>
        ) : (
          <TouchableOpacity 
            style={styles.cameraButton}
            onPress={takePicture}
            activeOpacity={0.8}
          >
            <Ionicons name="camera" size={32} color="#6C5CE7" />
            <Text style={styles.cameraButtonText}>Abrir Câmera</Text>
          </TouchableOpacity>
        )}
      </View>

      {!isCompleted && photoUri && (
        <TouchableOpacity 
          style={styles.completeButton}
          onPress={completeDelivery}
          activeOpacity={0.8}
        >
          <Text style={styles.completeButtonText}>Confirmar Entrega</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0E0E',
  },
  scrollContent: {
    paddingBottom: 30,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 50,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  card: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    marginTop: 20,
  },
  deliveryTitle: {
    color: '#BDBDBD',
    fontSize: 14,
    marginBottom: 4,
  },
  deliveryAddress: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 20,
  },
  mapContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  map: {
    height: 200,
  },
  marker: {
    backgroundColor: '#6C5CE7',
    padding: 8,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userMarker: {
    backgroundColor: '#3498DB',
    padding: 6,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  distanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  distanceText: {
    color: '#FFFFFF',
    marginLeft: 8,
    fontSize: 14,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  sectionSubtitle: {
    color: '#BDBDBD',
    fontSize: 14,
    marginBottom: 20,
  },
  cameraButton: {
    borderWidth: 2,
    borderColor: '#6C5CE7',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraButtonText: {
    color: '#6C5CE7',
    marginTop: 8,
    fontSize: 16,
    fontWeight: '500',
  },
  photoContainer: {
    alignItems: 'center',
  },
  previewImage: {
    width: '100%',
    height: 300,
    borderRadius: 12,
    marginBottom: 16,
  },
  retakeButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#2D3436',
    borderRadius: 30,
  },
  retakeButtonText: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  noPhotoContainer: {
    alignItems: 'center',
    padding: 40,
  },
  noPhotoText: {
    color: '#BDBDBD',
    marginTop: 16,
    fontSize: 16,
  },
  completeButton: {
    marginTop: 20,
    backgroundColor: '#6C5CE7',
    borderRadius: 30,
    padding: 18,
    marginHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  completeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default DeliveryCheckScreen;