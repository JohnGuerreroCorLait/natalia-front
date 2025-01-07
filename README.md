# Agente de Ventas

![Python](https://logodownload.org/wp-content/uploads/2019/10/python-logo-1.png)

Este proyecto es un **Agente de Ventas** desarrollado con **Angular 15** para el frontend, que se comunica con una API utilizando **WebSockets** implementada en **Python**. La API utiliza **FastAPI** y se sirve con **Uvicorn**. Además, se integran los modelos de **OpenAI** disponibles en [OpenAI Playground](https://platform.openai.com/playground/realtime) para mejorar la funcionalidad del agente.

## Características

- **Frontend**: Desarrollado en Angular 15.
- **Backend**: API en Python con FastAPI y Uvicorn.
- **WebSockets**: Comunicación en tiempo real entre el frontend y el backend.
- **Integración con OpenAI**: Utiliza modelos de OpenAI para potenciar las capacidades del agente.

## Estructura del Proyecto

- **/py**: Contiene la implementación en Python de la API. Aquí es donde se manejan las conexiones WebSocket y se integran los modelos de OpenAI.
- **/src**: Contiene el código fuente del frontend en Angular.

## Requisitos

Asegúrate de tener instalados los siguientes requisitos:

- [Node.js](https://nodejs.org/) (versión 14 o superior)
- [Python](https://www.python.org/) (versión 3.6 o superior)
- [Uvicorn](https://www.uvicorn.org/) para el servidor FastAPI.

## Instalación

### Frontend

1. Clona el repositorio:

   ```bash
   git clone https://github.com/JohnGuerreroCor/agente-ventas-front.git
