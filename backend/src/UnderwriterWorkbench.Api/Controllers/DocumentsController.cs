using Microsoft.AspNetCore.Mvc;
using UnderwriterWorkbench.Core.Interfaces;
using UnderwriterWorkbench.Core.Models;
using UnderwriterWorkbench.Infrastructure.Blob;

namespace UnderwriterWorkbench.Api.Controllers;

[ApiController]
[Route("api/v1/submissions/{submissionId}/documents")]
public class DocumentsController : ControllerBase
{
    private readonly ISubmissionRepository _repo;
    private readonly DocumentStorageService _storage;

    public DocumentsController(ISubmissionRepository repo, DocumentStorageService storage)
    {
        _repo = repo;
        _storage = storage;
    }

    [HttpPost]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> Upload(string submissionId, IFormFile file, [FromForm] string documentType = "wording")
    {
        var userId = User.Identity?.Name ?? "anonymous";
        var submission = await _repo.GetByIdAsync(submissionId);
        if (submission is null) return NotFound();

        var allowedMime = new[] { "application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document" };
        if (!allowedMime.Contains(file.ContentType))
            return BadRequest(new { error = "INVALID_FILE_TYPE", reason = "Only PDF and DOCX are accepted" });

        var blobName = $"{submissionId}/{Guid.NewGuid()}/{file.FileName}";
        using var stream = file.OpenReadStream();
        await _storage.UploadAsync(stream, blobName, file.ContentType);

        var doc = new DocumentRef
        {
            DocumentId = Guid.NewGuid().ToString(),
            FileName = file.FileName,
            MimeType = file.ContentType,
            BlobName = blobName,
            DocumentType = documentType,
            SizeBytes = file.Length,
            UploadedBy = userId
        };

        await _repo.AddDocumentRefAsync(submissionId, doc);
        await _repo.AppendAuditEntryAsync(submissionId, new AuditLogEntry
        {
            Action = "document-uploaded",
            Summary = $"Document '{file.FileName}' uploaded ({documentType})",
            Actor = new AuditActor { Type = "user", Id = userId, DisplayName = "Underwriter" }
        });

        return CreatedAtAction(nameof(GetDownloadUrl), new { submissionId, documentId = doc.DocumentId }, new
        {
            documentId = doc.DocumentId,
            fileName = doc.FileName,
            uploadedAt = doc.UploadedAt
        });
    }

    [HttpGet("{documentId}/download-url")]
    public async Task<IActionResult> GetDownloadUrl(string submissionId, string documentId)
    {
        var submission = await _repo.GetByIdAsync(submissionId);
        if (submission is null) return NotFound();

        var doc = submission.Documents.FirstOrDefault(d => d.DocumentId == documentId);
        if (doc is null) return NotFound();

        var expiresAt = DateTime.UtcNow.AddHours(1);
        var url = await _storage.GenerateSasUrlAsync(doc.BlobName, TimeSpan.FromHours(1));

        return Ok(new { url, expiresAt });
    }
}
