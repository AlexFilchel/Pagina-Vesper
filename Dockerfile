# Etapa 1: Build (Construcción)
FROM eclipse-temurin:21-jdk-alpine AS build

# Establecemos el directorio de trabajo
WORKDIR /app

# Copiamos todo el proyecto para mantener la estructura de directorios
# necesaria para que build.gradle encuentre ../Frontend
COPY . .

# Nos movemos al directorio del backend
WORKDIR /app/Backend

# Damos permisos de ejecución al wrapper de Gradle
RUN chmod +x gradlew

# Construimos el JAR. 
# bootJar empaqueta la aplicación. --no-daemon ahorra memoria en CI/CD.
RUN ./gradlew bootJar --no-daemon

# Etapa 2: Run (Ejecución)
FROM eclipse-temurin:21-jre-alpine

WORKDIR /app

# Instalamos tzdata para permitir la configuración de la zona horaria
RUN apk add --no-cache tzdata

# Configuramos la zona horaria
ENV TZ=America/Argentina/Buenos_Aires

# Copiamos el JAR generado en la etapa anterior.
# El comodín *.jar toma cualquier nombre que genere Gradle.
COPY --from=build /app/Backend/build/libs/*.jar app.jar

# Exponemos el puerto interno de la aplicación
EXPOSE 8080

# Comando de inicio
ENTRYPOINT ["java", "-jar", "app.jar"]
