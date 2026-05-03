const map = L.map('map').setView([0, 0], 3);

L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    minZoom: 1,
    maxZoom: 19,
    noWrap: true,
    bounds: [[-90, -180], [90, 180]],
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
}).addTo(map);

const issIcon = L.icon({
    iconUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect x="10" y="30" width="25" height="40" fill="%231E90FF" stroke="white" stroke-width="2"/><rect x="65" y="30" width="25" height="40" fill="%231E90FF" stroke="white" stroke-width="2"/><rect x="35" y="45" width="30" height="10" fill="silver" stroke="white" stroke-width="2"/><circle cx="50" cy="50" r="12" fill="%23A9A9A9" stroke="white" stroke-width="2"/></svg>',
    iconSize: [50, 50],
    iconAnchor: [25, 25]
});

const issMarker = L.marker([0, 0], { icon: issIcon }).addTo(map);

let firstLoad = true;
let currentLat = Math.random() * 180 - 90;
let currentLng = Math.random() * 360 - 180;
const speed = 0.5;

async function fetchISSData() {
    try {
        currentLng += speed;
        if (currentLng > 180) currentLng -= 360;

        currentLat = 40 * Math.sin(currentLng * (Math.PI / 180));

        const data = {
            latitude: currentLat,
            longitude: currentLng,
            altitude: 410 + (Math.random() * 10 - 5),
            velocity: 28000 + (Math.random() * 100 - 50),
            visibility: Math.random() > 0.5 ? 'daylight' : 'eclipsed'
        };

        const { latitude, longitude, altitude, velocity, visibility } = data;

        issMarker.setLatLng([latitude, longitude]);
        if (firstLoad) {
            map.setView([latitude, longitude], 3);
            firstLoad = false;
        }

        document.getElementById('altitude').innerText = `${altitude.toFixed(2)} km`;
        document.getElementById('velocity').innerText = `${velocity.toFixed(2)} km/h`;
        document.getElementById('visibility').innerText = visibility.charAt(0).toUpperCase() + visibility.slice(1);
    } catch (error) {
        console.error('Error updating simulated ISS location data:', error);
    }
}

function fetchCrewData() {
    try {
        const crewList = document.getElementById('crew-list');
        crewList.innerHTML = '';

        const simulatedCrew = [
            { name: 'Oleg Kononenko', craft: 'ISS', nationality: 'Roscosmos' },
            { name: 'Nikolai Chub', craft: 'ISS', nationality: 'Roscosmos' },
            { name: 'Tracy C. Dyson', craft: 'ISS', nationality: 'NASA' },
            { name: 'Matthew Dominick', craft: 'ISS', nationality: 'NASA' },
            { name: 'Michael Barratt', craft: 'ISS', nationality: 'NASA' },
            { name: 'Jeanette Epps', craft: 'ISS', nationality: 'NASA' },
            { name: 'Alexander Grebenkin', craft: 'ISS', nationality: 'Roscosmos' }
        ];

        simulatedCrew.forEach(member => {
            const li = document.createElement('li');
            li.innerHTML = `<span>${member.name}</span> <span style="color:var(--text-secondary)">${member.nationality}</span>`;
            crewList.appendChild(li);
        });
    } catch (error) {
        console.error('Error setting simulated crew data:', error);
    }
}

setInterval(fetchISSData, 500);
fetchISSData();
fetchCrewData();
