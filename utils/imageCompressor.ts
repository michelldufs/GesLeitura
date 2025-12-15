import imageCompression from 'browser-image-compression';

/**
 * Comprime uma imagem antes do upload para o Firebase Storage
 * Reduz custos de armazenamento mantendo qualidade aceitável
 * 
 * @param file - Arquivo de imagem original
 * @returns Promise com arquivo comprimido
 */
export const compressImage = async (file: File): Promise<File> => {
  const options = {
    maxSizeMB: 0.2, // Máximo 200KB
    maxWidthOrHeight: 1024, // Dimensão máxima (largura ou altura)
    useWebWorker: true, // Usa Web Worker para não bloquear UI
    fileType: 'image/jpeg', // Força JPEG para melhor compressão
  };

  try {
    console.log('🖼️ Imagem original:', {
      nome: file.name,
      tamanho: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
      tipo: file.type
    });

    const compressedFile = await imageCompression(file, options);

    console.log('✅ Imagem comprimida:', {
      nome: compressedFile.name,
      tamanho: `${(compressedFile.size / 1024).toFixed(2)} KB`,
      tipo: compressedFile.type,
      reducao: `${((1 - compressedFile.size / file.size) * 100).toFixed(1)}%`
    });

    return compressedFile;
  } catch (error) {
    console.error('❌ Erro ao comprimir imagem:', error);
    // Em caso de erro, retorna o arquivo original
    return file;
  }
};

/**
 * Valida se o arquivo é uma imagem válida
 */
export const isValidImage = (file: File): boolean => {
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  return validTypes.includes(file.type);
};

/**
 * Valida tamanho máximo do arquivo (antes da compressão)
 */
export const isValidSize = (file: File, maxSizeMB: number = 10): boolean => {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return file.size <= maxSizeBytes;
};
