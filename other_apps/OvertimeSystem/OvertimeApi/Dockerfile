FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

COPY ["OvertimeApi.csproj", "./"]
RUN dotnet restore "./OvertimeApi.csproj"

COPY . .
RUN dotnet build "OvertimeApi.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "OvertimeApi.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "OvertimeApi.dll"]