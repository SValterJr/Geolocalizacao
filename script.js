const API_KEY = "285cfcb99348a0bb57cf8940b4310531"; 

// Seletores
const cityInput = document.getElementById("cityInput");
const searchBtn = document.getElementById("searchBtn");
const geoBtn = document.getElementById("geoBtn");
const toggleTheme = document.getElementById("toggleTheme");
const currentContent = document.getElementById("currentContent");
const forecastContainer = document.getElementById("forecast");

let tempChart, humidityChart;

function initApp() {
    searchBtn.onclick = () => getWeather(cityInput.value);
    
    cityInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") getWeather(cityInput.value);
    });

    geoBtn.onclick = () => {
        if (navigator.geolocation) {
            setLoadingState();
            navigator.geolocation.getCurrentPosition(getGeoWeather, handleGeoError);
        } else {
            alert("Geolocalização não suportada.");
        }
    };

    toggleTheme.onclick = () => {
        document.body.classList.toggle("dark");
        const icon = toggleTheme.querySelector("i");
        if(document.body.classList.contains("dark")) {
            icon.classList.replace("ph-moon", "ph-sun");
        } else {
            icon.classList.replace("ph-sun", "ph-moon");
        }
        updateChartsTheme();
    };

    // Inicializa com uma cidade para não ficar vazio
    getWeather("Brasília");
}

// UI Helpers
function setLoadingState() {
    currentContent.innerHTML = `<div class="empty-state"><p>Carregando...</p></div>`;
}

async function getWeather(city) {
    if (!city) return;
    setLoadingState();

    const url = `https://api.openweathermap.org/data/2.5/forecast?q=${city}&units=metric&lang=pt_br&appid=${API_KEY}`;
    
    try {
        const res = await fetch(url);
        const data = await res.json();

        if (data.cod !== "200") {
            currentContent.innerHTML = `<div class="empty-state"><p>Cidade não encontrada.</p></div>`;
            return;
        }

        displayCurrent(data);
        displayForecast(data);
        updateCharts(data);
    } catch (error) {
        console.error(error);
        currentContent.innerHTML = `<div class="empty-state"><p>Erro na conexão.</p></div>`;
    }
}

function getGeoWeather(pos) {
    const { latitude, longitude } = pos.coords;
    const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${latitude}&lon=${longitude}&units=metric&lang=pt_br&appid=${API_KEY}`;
    
    fetch(url).then(r => r.json()).then(data => {
        if (data.cod !== "200") return;
        displayCurrent(data);
        displayForecast(data);
        updateCharts(data);
    });
}

function handleGeoError(error) {
    alert("Erro ao obter localização: " + error.message);
}

function displayCurrent(data) {
    const c = data.list[0];
    const iconUrl = `https://openweathermap.org/img/wn/${c.weather[0].icon}@4x.png`;
    
    // Novo layout do card principal
    currentContent.innerHTML = `
        <div style="flex: 1; z-index: 2;">
            <div class="weather-header">
                <h2>${data.city.name}</h2>
                <p>${new Date().toLocaleDateString('pt-BR', {weekday: 'long', day: 'numeric', month: 'long'})}</p>
            </div>
            <div class="weather-tempe" style="">
                <h1 class="weather-temp">${Math.round(c.main.temp)}°</h1>
                <img src="${iconUrl}" alt="Icone" style="width: 100px; height: 100px;">
            </div>
            <p class="weather-desc">${c.weather[0].description}</p>
            
            <div class="weather-details">
                <div class="detail-item">
                    <span>Vento</span>
                    <span>${c.wind.speed.toFixed(1)} km/h</span>
                </div>
                <div class="detail-item">
                    <span>Umidade</span>
                    <span>${c.main.humidity}%</span>
                </div>
                <div class="detail-item">
                    <span>Sensação</span>
                    <span>${Math.round(c.main.feels_like)}°</span>
                </div>
            </div>
        </div>
    `;
}

function displayForecast(data) {
    forecastContainer.innerHTML = "";
    const daily = data.list.filter(item => item.dt_txt.includes("12:00:00")).slice(0, 5);

    daily.forEach(d => {
        const date = new Date(d.dt_txt);
        const dayName = date.toLocaleDateString("pt-BR", {weekday: "short"}).replace('.', '');
        
        forecastContainer.innerHTML += `
            <div class="forecast-item">
                <span class="forecast-date">${dayName}</span>
                <div style="display:flex; align-items:center; gap:10px;">
                    <img src="https://openweathermap.org/img/wn/${d.weather[0].icon}.png" class="forecast-icon">
                    <span style="font-size: 0.9rem; color: var(--text-secondary)">${d.weather[0].main}</span>
                </div>
                <span class="forecast-temp">${Math.round(d.main.temp)}°</span>
            </div>
        `;
    });
}

function updateCharts(data) {
    const allData = data.list.slice(0, 12); // Pega apenas as próximas ~36 horas para o gráfico não ficar poluido
    const labels = allData.map(d => 
        new Date(d.dt_txt).toLocaleTimeString("pt-BR", {hour: '2-digit', minute: '2-digit'})
    );
    const temps = allData.map(d => d.main.temp);
    const humidity = allData.map(d => d.main.humidity);

    if (tempChart) tempChart.destroy();
    if (humidityChart) humidityChart.destroy();

    const isDark = document.body.classList.contains("dark");
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)';
    const textColor = isDark ? '#94a3b8' : '#64748b';

    const commonOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false }
        },
        scales: {
            y: {
                grid: { color: gridColor },
                ticks: { color: textColor }
            },
            x: {
                grid: { display: false },
                ticks: { color: textColor }
            }
        }
    };

    tempChart = new Chart(document.getElementById("tempChart"), {
        type: "line",
        data: {
            labels,
            datasets: [{
                label: "Temp (°C)",
                data: temps,
                borderColor: "#8b5cf6",
                backgroundColor: "rgba(139, 92, 246, 0.1)",
                borderWidth: 3,
                tension: 0.4,
                fill: true,
                pointRadius: 0,
                pointHoverRadius: 6
            }]
        },
        options: commonOptions
    });

    humidityChart = new Chart(document.getElementById("humidityChart"), {
        type: "bar",
        data: {
            labels,
            datasets: [{
                label: "Umidade (%)",
                data: humidity,
                backgroundColor: "#3b82f6",
                borderRadius: 4
            }]
        },
        options: commonOptions
    });
}

function updateChartsTheme() {
    if(tempChart) updateCharts({list: []}); // Hack simples para forçar re-render se necessário, ou apenas deixe o usuário buscar de novo.
}

document.addEventListener("DOMContentLoaded", initApp);