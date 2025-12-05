const API_KEY = "285cfcb99348a0bb57cf8940b4310531"; 

// Seletores de Elementos
const cityInput = document.getElementById("cityInput");
const searchBtn = document.getElementById("searchBtn");
const geoBtn = document.getElementById("geoBtn");
const toggleTheme = document.getElementById("toggleTheme");
const currentContent = document.getElementById("currentContent");
const forecastContainer = document.getElementById("forecast");

let tempChart, humidityChart;

// --- 1. Funções de Inicialização e Eventos ---

function initApp() {
    // Event Listeners
    searchBtn.onclick = () => getWeather(cityInput.value);
    
    // Adicionar suporte para pressionar ENTER no campo de busca
    cityInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
            getWeather(cityInput.value);
        }
    });

    // Evento de Geolocalização
    geoBtn.onclick = () => {
        if (navigator.geolocation) {
            currentContent.innerHTML = "Buscando sua localização...";
            navigator.geolocation.getCurrentPosition(getGeoWeather, handleGeoError);
        } else {
            currentContent.textContent = "Geolocalização não é suportada por este navegador.";
        }
    };

    // Evento de Tema
    toggleTheme.onclick = () => {
        document.body.classList.toggle("dark");
        toggleTheme.textContent = document.body.classList.contains("dark") ? "☀️" : "🌙";
    };

    // Tentar carregar a previsão do tempo para uma cidade padrão ao iniciar (opcional)
    getWeather("Porto Alegre"); 
}

// --- 2. Funções de Busca de Dados ---

async function getWeather(city) {
    if (!city) {
        currentContent.textContent = "Por favor, digite o nome de uma cidade.";
        return;
    }
    
    currentContent.textContent = "Buscando dados de " + city + "...";

    const url = `https://api.openweathermap.org/data/2.5/forecast?q=${city}&units=metric&lang=pt_br&appid=${API_KEY}`;
    
    try {
        const res = await fetch(url);
        const data = await res.json();

        if (data.cod !== "200") {
            currentContent.textContent = "❌ Cidade não encontrada. Verifique o nome ou sua API Key.";
            forecastContainer.innerHTML = "";
            if (tempChart) tempChart.destroy();
            if (humidityChart) humidityChart.destroy();
            return;
        }

        displayCurrent(data);
        displayForecast(data);
        updateCharts(data);
    } catch (error) {
        console.error("Erro ao buscar dados da API:", error);
        currentContent.textContent = "❌ Ocorreu um erro na comunicação com o servidor de clima.";
    }
}

function getGeoWeather(pos) {
    const { latitude, longitude } = pos.coords;
    currentContent.textContent = "Buscando dados de sua localização...";
    
    const cityUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${latitude}&lon=${longitude}&units=metric&lang=pt_br&appid=${API_KEY}`;
    
    fetch(cityUrl)
        .then(r => r.json())
        .then(data => {
            if (data.cod !== "200") {
                currentContent.textContent = "❌ Não foi possível obter dados para sua localização.";
                return;
            }
            displayCurrent(data);
            displayForecast(data);
            updateCharts(data);
        })
        .catch(error => {
            console.error("Erro ao buscar dados de geolocalização:", error);
            currentContent.textContent = "❌ Ocorreu um erro ao buscar o clima pela localização.";
        });
}

function handleGeoError(error) {
    let message = "Erro ao obter localização.";
    switch(error.code) {
        case error.PERMISSION_DENIED:
            message = "Acesso à localização negado pelo usuário.";
            break;
        case error.POSITION_UNAVAILABLE:
            message = "Informações de localização indisponíveis.";
            break;
        case error.TIMEOUT:
            message = "Tempo limite para obter localização excedido.";
            break;
    }
    currentContent.textContent = `❌ ${message}`;
}

// --- 3. Funções de Apresentação de Dados ---

function displayCurrent(data) {
    const c = data.list[0];
    const iconUrl = `https://openweathermap.org/img/wn/${c.weather[0].icon}@4x.png`;
    
    currentContent.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap;">
            <div>
                <h3>${data.city.name}</h3>
                <p><strong>${c.main.temp.toFixed(1)}°C</strong></p>
                <p>${c.weather[0].description.charAt(0).toUpperCase() + c.weather[0].description.slice(1)}</p>
                <p>Mín: ${c.main.temp_min.toFixed(1)}°C / Máx: ${c.main.temp_max.toFixed(1)}°C</p>
                <p>Vento: ${c.wind.speed.toFixed(1)} m/s</p>
                <p>Umidade: ${c.main.humidity}%</p>
            </div>
            <img src="${iconUrl}" alt="${c.weather[0].description}" style="width: 150px; height: 150px; flex-shrink: 0;">
        </div>
    `;
}

function displayForecast(data) {
    forecastContainer.innerHTML = "";

    // Filtra para um item por dia (previsão das 12:00) e garante no máximo 5 dias
    const daily = data.list
        .filter(item => item.dt_txt.includes("12:00:00"))
        .slice(0, 5);

    daily.forEach(d => {
        forecastContainer.innerHTML += `
            <div class="forecast-item">
                <h4>${new Date(d.dt_txt).toLocaleDateString("pt-BR",{weekday:"short"})}</h4>
                <img src="https://openweathermap.org/img/wn/${d.weather[0].icon}@2x.png" alt="${d.weather[0].description}">
                <p>${d.main.temp.toFixed(1)}°C</p>
                <p>${d.weather[0].description}</p>
            </div>
        `;
    });
}

// --- 4. Funções de Gráficos ---

function updateCharts(data) {
    // Usa todos os 40 pontos de dados para gráficos de linha detalhados
    const allData = data.list;

    // Rótulos de tempo a cada 3 horas
    const labels = allData.map(d => 
        new Date(d.dt_txt).toLocaleTimeString("pt-BR", {hour: '2-digit', minute: '2-digit'})
    );
    const temps = allData.map(d => d.main.temp);
    const humidity = allData.map(d => d.main.humidity);

    // Destroi gráficos antigos antes de criar novos
    if (tempChart) tempChart.destroy();
    if (humidityChart) humidityChart.destroy();

    // Configurações do Gráfico
    const commonOptions = {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            y: {
                beginAtZero: false,
                grid: {
                    color: document.body.classList.contains("dark") ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
                },
                ticks: {
                     color: document.body.classList.contains("dark") ? '#f3f4f6' : '#1a202c'
                }
            },
            x: {
                grid: {
                    display: false
                },
                ticks: {
                     color: document.body.classList.contains("dark") ? '#f3f4f6' : '#1a202c'
                }
            }
        },
        plugins: {
            legend: {
                labels: {
                    color: document.body.classList.contains("dark") ? '#f3f4f6' : '#1a202c'
                }
            }
        }
    };

    // Gráfico de Temperatura
    tempChart = new Chart(document.getElementById("tempChart"), {
        type: "line",
        data: {
            labels,
            datasets: [{
                label: "Temperatura (°C)",
                data: temps,
                borderColor: "#ff9800",
                tension: 0.4,
                fill: false,
                pointBackgroundColor: "#ff9800",
            }]
        },
        options: commonOptions
    });

    // Gráfico de Umidade
    humidityChart = new Chart(document.getElementById("humidityChart"), {
        type: "line",
        data: {
            labels,
            datasets: [{
                label: "Umidade (%)",
                data: humidity,
                borderColor: "#2196f3",
                tension: 0.4,
                fill: false,
                pointBackgroundColor: "#2196f3",
            }]
        },
        options: commonOptions
    });
}

// Chamada para Iniciar a Aplicação após o HTML carregar
document.addEventListener("DOMContentLoaded", initApp);