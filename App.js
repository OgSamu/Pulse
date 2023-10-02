import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
} from "react-native";
import io from "socket.io-client";
import * as Location from "expo-location";

const socket = io.connect("http://192.168.1.107:3001");

export default function App() {
  const [errorMsg, setErrorMsg] = useState(null);
  const [room, setRoom] = useState("");
  const [name, setName] = useState("");
  const [usersInRoom, setUsersInRoom] = useState([]);

  useEffect(() => {
    socket.on("receive_speed_data", (data) => {
      setUsersInRoom((prevUsers) => {
        const updatedUsers = [...prevUsers];
        const existingUserIndex = updatedUsers.findIndex(
          (user) => user.name === data.speedData.name
        );
        if (existingUserIndex !== -1) {
          updatedUsers[existingUserIndex].speed = data.speedData.speed;
        } else {
          updatedUsers.push(data.speedData);
        }
        return updatedUsers;
      });
    });

    // New effect to handle initialization of users when you join the room
    socket.on("users_in_room", (users) => {
      setUsersInRoom(users);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const joinRoom = async () => {
    if (room !== "" && name !== "") {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setErrorMsg("Permission to access location was denied");
        return;
      }

      // Subscribe to location updates
      const subscriber = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 1000 },
        (location) => {
          let speed = location.coords.speed;
          if (!speed) speed = 0; // fallback
          speed *= 3.6; // Convert m/s to km/h
          const speedData = { name, speed };

          // Update your own speed in local state
          setUsersInRoom((prevState) => {
            const updatedUsers = [...prevState];
            const existingUserIndex = updatedUsers.findIndex(
              (user) => user.name === name
            );
            if (existingUserIndex !== -1) {
              updatedUsers[existingUserIndex].speed = speed;
            } else {
              updatedUsers.push(speedData);
            }
            return updatedUsers;
          });

          // Send the speed data to the server
          socket.emit("send_speed_data", { speedData, room });
        }
      );

      socket.emit("join_room", room);
      Alert.alert("Connected", `You have joined room ${room}!`);

      return () => {
        subscriber.remove(); // Unsubscribe from location updates
      };
    }
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="Name..."
        onChangeText={(text) => setName(text)}
      />
      <TextInput
        style={styles.input}
        placeholder="Room Number..."
        onChangeText={(text) => setRoom(text)}
      />
      <TouchableOpacity style={styles.customButton} onPress={joinRoom}>
        <Text style={styles.buttonText}>Connect</Text>
      </TouchableOpacity>
      <Text>Users in room:</Text>
      {usersInRoom.map((user, index) => (
        <Text key={index}>
          {user.name}: {user.speed.toFixed(2)} km/h
        </Text>
      ))}
      {errorMsg ? <Text>{errorMsg}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  input: {
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    padding: 20,
    color: "#000",
    width: "80%",
  },
  btn: {
    marginTop: 60,
  },
  customButton: {
    backgroundColor: "red",
    padding: 10,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 5,
    marginTop: 20,
  },
  buttonText: {
    color: "white",
    fontSize: 16,
  },
});
