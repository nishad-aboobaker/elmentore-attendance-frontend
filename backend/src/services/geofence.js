const haversine = require('haversine-distance');

const isWithinGeofence = (userLat, userLng, sessionLat, sessionLng, radiusMeters) => {
  const userPoint = { latitude: userLat, longitude: userLng };
  const sessionPoint = { latitude: sessionLat, longitude: sessionLng };
  const distance = haversine(userPoint, sessionPoint);
  return distance <= radiusMeters;
};

module.exports = { isWithinGeofence };
