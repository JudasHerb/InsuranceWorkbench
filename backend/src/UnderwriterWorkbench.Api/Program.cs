using Microsoft.Azure.Cosmos;
using UnderwriterWorkbench.Api.Hubs;
using UnderwriterWorkbench.Core.Interfaces;
using UnderwriterWorkbench.Infrastructure.Agents;
using UnderwriterWorkbench.Infrastructure.Blob;
using UnderwriterWorkbench.Infrastructure.Cosmos;
using UnderwriterWorkbench.Infrastructure.OpenShift;
using UnderwriterWorkbench.Infrastructure.Portfolio;
using UnderwriterWorkbench.Infrastructure.Sanctions;

// IWorkbenchNotifier registered after SignalR (WorkbenchNotifier depends on IHubContext<WorkbenchHub>)

var builder = WebApplication.CreateBuilder(args);
var config = builder.Configuration;

// Cosmos DB
builder.Services.AddSingleton(sp =>
{
    var connectionString = config["CosmosDb:ConnectionString"]
        ?? "AccountEndpoint=https://localhost:8081/;AccountKey=C2y6yDjf5/R+ob0N8A7Cgv30VRDJIWEHLM+4QDU5DE2nQ9nDuVTqobD4b8mGGyPMbIZnqyMszxqLLwjLSSS8tg==";
    return new CosmosClient(connectionString, new CosmosClientOptions
    {
        SerializerOptions = new CosmosSerializationOptions
        {
            PropertyNamingPolicy = CosmosPropertyNamingPolicy.CamelCase
        }
    });
});
builder.Services.AddSingleton<CosmosDbInitializer>();
builder.Services.AddScoped<ISubmissionRepository, SubmissionRepository>();

// Blob Storage
builder.Services.AddSingleton<DocumentStorageService>();

// Sanctions
if (config.GetValue<bool>("Sanctions:UseMock", true))
    builder.Services.AddSingleton<ISanctionsApiClient, MockSanctionsApiClient>();

// OpenShift
if (config.GetValue<bool>("OpenShift:UseMock", true))
    builder.Services.AddSingleton<IOpenShiftApiClient, MockOpenShiftApiClient>();

// Agent services
builder.Services.AddScoped<NamesClearanceService>();
builder.Services.AddScoped<LegalAgentService>();
builder.Services.AddScoped<DevAgentService>();
builder.Services.AddScoped<PortfolioSnapshotService>();
builder.Services.AddHostedService<B2BHostedService>();
builder.Services.AddHostedService<DevToolCleanupJob>();
builder.Services.AddSingleton<B2BSessionQueue>();

// SignalR
builder.Services.AddSignalR();
builder.Services.AddSingleton<IWorkbenchNotifier, WorkbenchNotifier>();

// Controllers
builder.Services.AddControllers();

// Swagger / OpenAPI
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new() { Title = "Underwriter Workbench API", Version = "v1" });
});

// CORS for frontend dev
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
        policy.WithOrigins("http://localhost:5173")
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials());
});

var app = builder.Build();

// Initialize Cosmos DB
using (var scope = app.Services.CreateScope())
{
    var initializer = scope.ServiceProvider.GetRequiredService<CosmosDbInitializer>();
    await initializer.InitializeAsync();
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseExceptionHandler(errorApp =>
{
    errorApp.Run(async context =>
    {
        context.Response.StatusCode = 500;
        context.Response.ContentType = "application/problem+json";
        await context.Response.WriteAsJsonAsync(new
        {
            type = "https://tools.ietf.org/html/rfc7807",
            title = "Internal Server Error",
            status = 500
        });
    });
});

app.UseCors();
app.UseHttpsRedirection();
app.UseAuthorization();
app.MapControllers();
app.MapHub<WorkbenchHub>("/hubs/workbench");

app.Run();
