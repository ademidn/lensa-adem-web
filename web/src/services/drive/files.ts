import { drive } from "./client";

export async function listFolders(parentFolderId: string) {
  const response = await drive.files.list({
    q: `'${parentFolderId}' in parents and mimeType='application/vnd.google-apps.folder'`,
    fields: "files(id, name, mimeType)",
  });

  return response.data.files || [];
}

export async function listPdfFiles(folderId: string) {
  const response = await drive.files.list({
    q: `'${folderId}' in parents and mimeType='application/pdf'`,
    fields: "files(id, name, mimeType)",
  });

  return response.data.files || [];
}

export async function listAllRegulationFiles(
  rootFolderId: string
) {
  const folders = await listFolders(rootFolderId);

  const allFiles = [];

  for (const folder of folders) {
    if (!folder.id) continue;

    const files = await listPdfFiles(folder.id);

    allFiles.push({
      folder: folder.name,
      files,
    });
  }

  return allFiles;
}

export async function downloadPdf(fileId: string) {
  try {
    console.log("Downloading file:", fileId);

    const response = await drive.files.get(
      {
        fileId,
        alt: "media",
      },
      {
        responseType: "arraybuffer",
      }
    );

    console.log("Download success");

    return Buffer.from(response.data as ArrayBuffer);
  } catch (error: any) {
    console.error(
      "DOWNLOAD ERROR:",
      error?.response?.data || error.message
    );

    throw error;
  }
}