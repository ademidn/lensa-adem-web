import { drive } from "./client";

export async function listRegulationFiles(folderId: string) {
    const response = await drive.files.list({
        q: `'${folderId}' in parents and mimeType='application/pdf'`,
        fields: "files(id, name)",
    });

    return response.data.files || [];
}