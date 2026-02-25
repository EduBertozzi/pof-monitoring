# Plataforma de Monitoramento Remoto para Sistemas Power-over-Fiber (PoF)

Este repositório contém o código-fonte e os arquivos do sistema de monitoramento inteligente desenvolvido para otimizar a eficiência e garantir a operação estável de enlaces *Power-over-Fiber* (PoF). O projeto utiliza um microcontrolador ESP32 para aquisição de dados em tempo real e atua como um servidor web embarcado, fornecendo uma interface gráfica interativa para supervisão.

## 🚀 Funcionalidades

* **Aquisição de Dados em Tempo Real:** Leitura contínua de tensão, corrente e potência utilizando o sensor MAX471.
* **Interface Web Embarcada:** *Dashboard* interativo (Single Page Application) servido diretamente pelo ESP32.
* **Gráficos Dinâmicos:** Visualização temporal das grandezas elétricas com taxas de atualização configuráveis.
* **Sistema de Alertas:** Notificações visuais e sonoras integradas na interface caso os limites de segurança sejam ultrapassados (ex: sobrecorrente ou circuito aberto).
* **Exportação de Dados:** Geração e download do histórico completo da sessão em formato `.CSV` para análises posteriores.

## 🛠️ Hardware Utilizado

* **Microcontrolador:** ESP32
* **Sensor de Corrente/Tensão:** MAX471
* **Componentes PoF:** * High-Power Laser Diode (HPLD) em 808 nm
  * Fibra Óptica Multimodo (62,5/125 µm)
  * Photovoltaic Power Converter (PPC)
* **Conversor DC/DC:** Step-up (para elevar a tensão à carga final)

## 📁 Estrutura do Projeto

O projeto foi desenvolvido utilizando a extensão **PlatformIO** no **Visual Studio Code (VSCode)**. A estrutura principal de diretórios é a seguinte:

```text
├── data/               # Arquivos da interface Web (Frontend)
│   ├── index.html      # Estrutura HTML da Single Page Application
│   ├── style.css       # Estilos visuais e temas (Light/Dark mode)
│   └── script.js       # Lógica do frontend, gráficos e requisições assíncronas
├── src/                # Código-fonte do Firmware (Backend)
│   └── main.cpp        # Lógica principal em C/C++ (Aquisição, Wi-Fi, Servidor Web)
├── include/            # Arquivos de cabeçalho adicionais (se houver)
├── lib/                # Bibliotecas externas específicas do projeto
└── platformio.ini      # Arquivo de configuração de ambiente e dependências do PlatformIO
```
