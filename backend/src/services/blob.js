import { BlobServiceClient } from '@azure/storage-blob';
import { env } from '../config/env.js';

function getContainer() {
  if (!env.blob.connectionString) {
    throw new Error('BLOB_CONNECTION_STRING não configurado');
  }
  const service = BlobServiceClient.fromConnectionString(env.blob.connectionString);
  return service.getContainerClient(env.blob.container);
}

export async function ensureBlobContainer() {
  if (!env.blob.connectionString) return false;
  const container = getContainer();
  // Sem `access`: container privado (sem listagem/leitura anônima).
  await container.createIfNotExists();
  return true;
}

export async function uploadBlob(blobName, buffer, contentType) {
  const container = getContainer();
  await container.createIfNotExists();
  const block = container.getBlockBlobClient(blobName);
  await block.uploadData(buffer, {
    blobHTTPHeaders: { blobContentType: contentType || 'application/octet-stream' },
  });
  // Nunca retornar URL direta do storage — acesso só via API autenticada.
  return { name: blobName, contentType: contentType || 'application/octet-stream' };
}

export async function downloadBlob(blobName) {
  const container = getContainer();
  const block = container.getBlockBlobClient(blobName);
  const download = await block.download();
  const chunks = [];
  for await (const chunk of download.readableStreamBody) {
    chunks.push(chunk);
  }
  return {
    buffer: Buffer.concat(chunks),
    contentType: download.contentType || 'application/octet-stream',
  };
}

export async function deleteBlob(blobName) {
  const container = getContainer();
  const block = container.getBlockBlobClient(blobName);
  await block.deleteIfExists();
}
