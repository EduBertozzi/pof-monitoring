/**
 * @file main.cpp
 * @brief Código unificado: Servidor Web (LittleFS) + Nova lógica de sensor MAX471 (Pino 2)
 */

#include <Arduino.h>
#include <WiFi.h>
#include <ESPAsyncWebServer.h>
#include "LittleFS.h"

// --- CREDENCIAIS DE REDE ---
// ====== CONFIG Wi-Fi ======
const char* ssid = "iPhone de Eduardo";       
const char* password = "bert1234";  

// --- CONFIGURAÇÃO DO SENSOR (Do seu novo código) ---
const int pinoADC = 2; // Pino único utilizado
const float resolucaoADC = 4095;
const float tensRef = 3.0;        
const float sensibMAX = 3.8; // Sensibilidade definida

// --- VARIÁVEIS GLOBAIS ---
float valorFiltrado = 0; // Variável para o filtro exponencial

// Variáveis para o Dashboard (JSON)
float tensao = 0.0;
float corrente = 0.0;
float potencia = 0.0;
float picoTensao = 0.0;

// --- CONTROLE DE TEMPO (Non-blocking delay) ---
unsigned long ultimaLeitura = 0;
const unsigned long intervaloLeitura = 500; // 500ms 

// --- SERVIDOR WEB ---
AsyncWebServer server(80);

// ===================================================================
// FUNÇÃO: Leitura do Sensor (Lógica nova implementada)
// ===================================================================
void lerSensores() {
  // 1. Leitura com filtro exponencial 
  int leituraADC = analogRead(pinoADC);
  valorFiltrado = (0.9 * valorFiltrado) + (0.1 * leituraADC);

  // 2. Converte leitura filtrada em tensão (no pino) e corrente
  // Nota: 'tensao' aqui é a tensão lida no pino ADC (0-3V), usada para calcular a corrente
  float tensaoLida = (valorFiltrado / resolucaoADC) * tensRef;
  
  // Atualiza as variáveis globais para o servidor
  tensao = tensaoLida * 10.0; 
  corrente = tensaoLida / sensibMAX;
  
  // Cálculo básico de potência (P = V * I)
  // Obs: Como só estamos lendo a saída de corrente, a "tensão" aqui é a do sinal do sensor,
  // não a da carga. Para potência real da carga, precisaria ler a tensão da fonte também.
  potencia = tensao * corrente; 

  // Atualiza pico de tensão (baseado na leitura do ADC)
  if (tensao > picoTensao) picoTensao = tensao;

  // Debug na Serial (Igual ao seu código novo)
  Serial.print("ADC: ");
  Serial.print(valorFiltrado, 1);
  Serial.print(" | Tensão: ");
  Serial.print(tensao, 5);
  Serial.print(" V | Corrente: ");
  // mas verifique se não queria *1000 para mA
  Serial.print(corrente * 100, 1); 
  Serial.println(" mA ");
}

// ===================================================================
// SETUP
// ===================================================================
void setup() {
  Serial.begin(115200);
  
  // Configuração do Pino (Do seu novo código)
  pinMode(pinoADC, INPUT);
  analogReadResolution(12); // ADC com 12 bits

  Serial.println("\nIniciando sistema...");

  // Inicia o sistema de arquivos (Importante para o site funcionar)
  if (!LittleFS.begin(true)) {
    Serial.println("❌ Erro ao montar o LittleFS");
    return;
  }
  Serial.println("✅ LittleFS montado com sucesso.");

  // Conecta ao Wi-Fi
  WiFi.begin(ssid, password);
  Serial.print("Conectando ao WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\n✅ Conectado ao WiFi!");
  Serial.print("📡 IP: ");
  Serial.println(WiFi.localIP());

  // --- ROTAS DO SERVIDOR ---
  server.serveStatic("/", LittleFS, "/").setDefaultFile("index.html");

  // Rota JSON para o Dashboard
  server.on("/dados", HTTP_GET, [](AsyncWebServerRequest *request){
    String json = "{";
    json += "\"tensao\":"     + String(tensao, 4)      + ","; // Tensão do sinal ADC
    json += "\"corrente\":"   + String(corrente, 4)    + ","; // Corrente calculada (Amperes)
    json += "\"potencia\":"   + String(potencia, 4)    + ",";
    json += "\"picoTensao\":" + String(picoTensao, 4);
    json += "}";
    request->send(200, "application/json", json);
  });

  server.onNotFound([](AsyncWebServerRequest *request){
    request->send(404, "text/plain", "404: Not Found");
  });

  server.begin();
  Serial.println("🚀 Servidor HTTP iniciado.");
}

// ===================================================================
// LOOP
// ===================================================================
void loop() {
  // Substituí o delay(500) por millis() para não travar o Wi-Fi
  unsigned long agora = millis();
  if (agora - ultimaLeitura >= intervaloLeitura) {
    lerSensores();
    ultimaLeitura = agora;
  }
}