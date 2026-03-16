# Ballarat Weather Dashboard

A full-stack web application designed to track, store, and visualize historical daily weather statistics (temperature and rainfall) for Ballarat. The application features an automated backend scraper that continuously updates a local database, and a modern, responsive frontend that provides interactive charts and data visualizations.

## 🚀 Features

- **Automated Weather Data Scraping:** A scheduled background job (powered by APScheduler) runs every 6 hours to fetch the latest weather statistics.
- **Interactive Data Visualizations:** Beautiful, responsive charts built with Recharts to explore monthly minimum/maximum temperatures and rainfall.
- **Modern User Interface:** A sleek UI crafted with React, Tailwind CSS, and smooth animations using GSAP.
- **Robust REST API:** A fast and efficient backend API built with FastAPI and SQLAlchemy to serve weather data.
- **Fully Containerized:** Docker and Docker Compose configurations are included for hassle-free deployment and environment setup.

## 🛠️ Tech Stack

**Frontend:**
- React (bootstrapped with Vite)
- Tailwind CSS
- Recharts (for data visualization)
- GSAP (for animations)
- Lucide React (for icons)

**Backend:**
- Python 3 / FastAPI
- SQLAlchemy (SQLite database)
- APScheduler (for background scraping jobs)

**Deployment:**
- Docker & Docker Compose

## 💻 Getting Started

### Prerequisites

Make sure you have [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/) installed on your machine.

### Installation & Execution

1. **Clone the repository:**
   ```bash
   git clone https://github.com/magicman3211/ballarat-weather.git
   cd ballarat-weather
   ```

2. **Run with Docker Compose:**
   Build and start the application containers in detached mode:
   ```bash
   docker-compose up --build -d
   ```

3. **Access the application:**
   - **Frontend:** Open your browser and navigate to `http://localhost:8081`
   - **Backend API Docs:** Navigate to `http://localhost:8081/docs` (if routed) or `http://backend-ip:8001/docs`

## 📂 Project Structure

- `/backend/` - Contains the FastAPI application, database connections, and the weather scraper logic.
- `/frontend/` - Contains the React Vite application, Tailwind configurations, and UI components.
- `docker-compose.yml` - Defines the services, networks, and volumes for containerized deployment.
