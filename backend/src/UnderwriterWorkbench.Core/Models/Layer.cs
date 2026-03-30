using System.Text.Json.Serialization;

namespace UnderwriterWorkbench.Core.Models;

public class Layer
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = Guid.NewGuid().ToString();

    [JsonPropertyName("layerNo")]
    public int LayerNo { get; set; }

    [JsonPropertyName("layerType")]
    public string LayerType { get; set; } = "primary";

    [JsonPropertyName("limit")]
    public decimal Limit { get; set; }

    [JsonPropertyName("attachmentPoint")]
    public decimal AttachmentPoint { get; set; }

    [JsonPropertyName("lineSize")]
    public decimal LineSize { get; set; }

    [JsonPropertyName("premium")]
    public decimal Premium { get; set; }

    [JsonPropertyName("currency")]
    public string Currency { get; set; } = "USD";

    [JsonPropertyName("status")]
    public string Status { get; set; } = "quoted";

    [JsonPropertyName("facriPanels")]
    public List<FacRiPanel> FacriPanels { get; set; } = [];
}
