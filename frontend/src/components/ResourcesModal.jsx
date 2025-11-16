import React, { useState } from 'react';
import { X, FileText, Download, ExternalLink, FileSpreadsheet } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '../lib/utils';

// Configuración de recursos disponibles
// Para obtener el ID del archivo de Google Drive:
// 1. Abre el archivo en Google Drive
// 2. Copia el enlace de compartir
// 3. El ID está en la URL: https://drive.google.com/file/d/ID_AQUI/view
const RESOURCES = [
  {
    id: 1,
    name: 'Gripe Aviar (H5N1)',
    type: 'pdf',
    description: 'Gripe Aviar (H5N1) - Información y actuaciones',
    driveId: '1cxNi5p7lR6lYyRazrpPrSH24OvKCn0aw', // ID extraído de la URL de Google Drive
    category: 'Guías'
  },
  {
    id: 2,
    name: 'Plantilla de Correción de Errores',
    type: 'xlsx',
    description: 'Excel para llevar el control de tus errores',
    driveId: 'TU_FILE_ID_AQUI', // Reemplazar con el ID real del archivo
    category: 'Herramientas'
  },
  {
    id: 3,
    name: 'Mpox (Monkeypox) - Información y actuaciones',
    type: 'pdf',
    description: 'Mpox (Monkeypox) - Información y actuaciones',
    driveId: 'TU_FILE_ID_AQUI', // Reemplazar con el ID real del archivo
    category: 'Protocolos'
  },
  // Añade más recursos aquí según necesites
];

export default function ResourcesModal({ isOpen, onClose, isDarkMode }) {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen) return null;

  // Obtener categorías únicas
  const categories = ['all', ...new Set(RESOURCES.map(r => r.category))];

  // Filtrar recursos
  const filteredResources = RESOURCES.filter(resource => {
    const matchesCategory = selectedCategory === 'all' || resource.category === selectedCategory;
    const matchesSearch = resource.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         resource.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Extraer ID de Google Drive de una URL o devolver el ID directamente
  const extractDriveId = (driveIdOrUrl) => {
    if (!driveIdOrUrl || driveIdOrUrl === 'TU_FILE_ID_AQUI') {
      return null;
    }
    
    // Si es una URL completa, extraer el ID
    if (driveIdOrUrl.includes('drive.google.com')) {
      const match = driveIdOrUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
      if (match && match[1]) {
        return match[1];
      }
    }
    
    // Si ya es un ID, devolverlo directamente
    return driveIdOrUrl;
  };

  // Generar URL de Google Drive
  const getDriveUrl = (driveIdOrUrl, type) => {
    const driveId = extractDriveId(driveIdOrUrl);
    if (!driveId) {
      return null;
    }
    
    if (type === 'pdf') {
      // Para PDFs: enlace de visualización
      return `https://drive.google.com/file/d/${driveId}/view`;
    } else {
      // Para XLSX: enlace de descarga directa
      return `https://drive.google.com/uc?export=download&id=${driveId}`;
    }
  };

  // Generar URL de descarga directa
  const getDownloadUrl = (driveIdOrUrl) => {
    const driveId = extractDriveId(driveIdOrUrl);
    if (!driveId) {
      return null;
    }
    return `https://drive.google.com/uc?export=download&id=${driveId}`;
  };

  const handleView = (resource) => {
    const url = getDriveUrl(resource.driveId, resource.type);
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      alert('Este recurso aún no está configurado. Por favor, contacta al administrador.');
    }
  };

  const handleDownload = (resource) => {
    const url = getDownloadUrl(resource.driveId);
    if (url) {
      // Crear un enlace temporal para descargar
      const link = document.createElement('a');
      link.href = url;
      link.download = `${resource.name}.${resource.type}`;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      alert('Este recurso aún no está configurado. Por favor, contacta al administrador.');
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className={cn(
          "relative w-full max-w-4xl max-h-[90vh] bg-card border border-border rounded-lg shadow-xl",
          "flex flex-col overflow-hidden",
          isDarkMode && "dark"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-2xl font-bold">Recursos de Estudio</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Accede a guías, plantillas y materiales de estudio
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="rounded-full"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Filtros y búsqueda */}
        <div className="p-6 border-b border-border space-y-4">
          {/* Búsqueda */}
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar recursos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 pl-10 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <FileText className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
          </div>

          {/* Categorías */}
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(category)}
                className="capitalize"
              >
                {category === 'all' ? 'Todos' : category}
              </Button>
            ))}
          </div>
        </div>

        {/* Lista de recursos */}
        <div className="flex-1 overflow-y-auto p-6">
          {filteredResources.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {searchTerm 
                  ? 'No se encontraron recursos con ese término de búsqueda'
                  : 'No hay recursos disponibles en esta categoría'}
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {filteredResources.map((resource) => {
                const Icon = resource.type === 'pdf' ? FileText : FileSpreadsheet;
                const hasValidId = extractDriveId(resource.driveId) !== null;

                return (
                  <div
                    key={resource.id}
                    className={cn(
                      "p-4 border border-border rounded-lg",
                      "hover:border-primary transition-colors",
                      "flex flex-col gap-3",
                      !hasValidId && "opacity-60"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        "p-2 rounded-lg",
                        resource.type === 'pdf' 
                          ? "bg-red-100 dark:bg-red-900/20" 
                          : "bg-green-100 dark:bg-green-900/20"
                      )}>
                        <Icon className={cn(
                          "h-5 w-5",
                          resource.type === 'pdf' 
                            ? "text-red-600 dark:text-red-400" 
                            : "text-green-600 dark:text-green-400"
                        )} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-lg truncate">{resource.name}</h3>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {resource.description}
                        </p>
                        <span className="inline-block mt-2 px-2 py-1 text-xs bg-accent rounded">
                          {resource.category}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2 mt-auto">
                      {resource.type === 'pdf' && hasValidId && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleView(resource)}
                          className="flex-1"
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Ver
                        </Button>
                      )}
                      <Button
                        variant={hasValidId ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleDownload(resource)}
                        className="flex-1"
                        disabled={!hasValidId}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Descargar
                      </Button>
                    </div>

                    {!hasValidId && (
                      <p className="text-xs text-muted-foreground italic">
                        ⚠️ Recurso pendiente de configuración
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-muted/50">
          <p className="text-xs text-center text-muted-foreground">
            Los recursos se abren en Google Drive. Asegúrate de tener permisos de acceso.
          </p>
        </div>
      </div>
    </div>
  );
}

