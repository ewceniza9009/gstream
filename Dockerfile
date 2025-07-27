# Stage 1: Build the application using the .NET 9 SDK
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

# Copy solution and project files
COPY ["gstream.sln", "./"]
COPY ["gstream.csproj", "./"]

# Restore dependencies using the solution file for better context
RUN dotnet restore "gstream.sln"

# Copy the rest of the application source code
COPY . .

# Publish the application, referencing the project file directly
RUN dotnet publish "gstream.csproj" -c Release -o /app/publish

# Stage 2: Create the final runtime image using the .NET 9 runtime
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS final
WORKDIR /app
COPY --from=build /app/publish .

# Expose the port the application will run on
EXPOSE 8080

# Define the entry point for the container
ENTRYPOINT ["dotnet", "gstream.dll"]
