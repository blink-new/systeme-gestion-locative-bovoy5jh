import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Building2, MapPin, Plus, Edit2, Trash2, Home, Car, Save, X } from 'lucide-react'
import { blink, Building, Unit } from '@/blink/client'

export function Buildings() {
  const [buildings, setBuildings] = useState<Building[]>([])
  const [units, setUnits] = useState<Unit[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingBuilding, setEditingBuilding] = useState<Building | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [newBuilding, setNewBuilding] = useState({
    name: '',
    address: ''
  })
  const [newUnit, setNewUnit] = useState({
    buildingId: '',
    unitNumber: '',
    type: 'apartment' as 'apartment' | 'garage',
    surface: 0,
    rooms: 1,
    status: 'free' as 'free' | 'occupied'
  })
  const [isAddUnitDialogOpen, setIsAddUnitDialogOpen] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const user = await blink.auth.me()
      if (!user) return

      const [buildingsData, unitsData] = await Promise.all([
        blink.db.buildings.list({ where: { userId: user.id } }),
        blink.db.units.list({ where: { userId: user.id } })
      ])
      
      setBuildings(buildingsData)
      setUnits(unitsData)
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddBuilding = async () => {
    try {
      const user = await blink.auth.me()
      if (!user) return

      if (!newBuilding.name.trim() || !newBuilding.address.trim()) {
        alert('Le nom et l\'adresse sont obligatoires')
        return
      }

      await blink.db.buildings.create({
        name: newBuilding.name,
        address: newBuilding.address,
        userId: user.id
      })

      setNewBuilding({ name: '', address: '' })
      setIsAddDialogOpen(false)
      loadData()
    } catch (error) {
      console.error('Erreur lors de l\'ajout du bâtiment:', error)
      alert('Erreur lors de l\'ajout du bâtiment')
    }
  }

  const handleEditBuilding = async () => {
    try {
      if (!editingBuilding) return

      if (!editingBuilding.name.trim() || !editingBuilding.address.trim()) {
        alert('Le nom et l\'adresse sont obligatoires')
        return
      }

      await blink.db.buildings.update(editingBuilding.id, {
        name: editingBuilding.name,
        address: editingBuilding.address
      })

      setEditingBuilding(null)
      setIsEditDialogOpen(false)
      loadData()
    } catch (error) {
      console.error('Erreur lors de la modification du bâtiment:', error)
      alert('Erreur lors de la modification du bâtiment')
    }
  }

  const handleDeleteBuilding = async (buildingId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce bâtiment ? Toutes les unités associées seront également supprimées.')) {
      return
    }

    try {
      // Supprimer d'abord toutes les unités du bâtiment
      const buildingUnits = units.filter(unit => unit.buildingId === buildingId)
      for (const unit of buildingUnits) {
        await blink.db.units.delete(unit.id)
      }

      // Puis supprimer le bâtiment
      await blink.db.buildings.delete(buildingId)
      loadData()
    } catch (error) {
      console.error('Erreur lors de la suppression du bâtiment:', error)
      alert('Erreur lors de la suppression du bâtiment')
    }
  }

  const handleAddUnit = async () => {
    try {
      const user = await blink.auth.me()
      if (!user) return

      if (!newUnit.buildingId || !newUnit.unitNumber.trim()) {
        alert('Le bâtiment et le numéro d\'unité sont obligatoires')
        return
      }

      await blink.db.units.create({
        buildingId: newUnit.buildingId,
        unitNumber: newUnit.unitNumber,
        type: newUnit.type,
        surface: newUnit.surface,
        rooms: newUnit.rooms,
        status: newUnit.status,
        userId: user.id
      })

      setNewUnit({
        buildingId: '',
        unitNumber: '',
        type: 'apartment',
        surface: 0,
        rooms: 1,
        status: 'free'
      })
      setIsAddUnitDialogOpen(false)
      loadData()
    } catch (error) {
      console.error('Erreur lors de l\'ajout de l\'unité:', error)
      alert('Erreur lors de l\'ajout de l\'unité')
    }
  }

  const getUnitsForBuilding = (buildingId: string) => {
    return units.filter(unit => unit.buildingId === buildingId)
  }

  const getOccupancyStats = (buildingId: string) => {
    const buildingUnits = getUnitsForBuilding(buildingId)
    const occupied = buildingUnits.filter(unit => unit.status === 'occupied').length
    const total = buildingUnits.length
    return { occupied, total, rate: total > 0 ? Math.round((occupied / total) * 100) : 0 }
  }

  const filteredBuildings = buildings.filter(building =>
    building.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    building.address.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-64 bg-gray-200 rounded"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Gestion des Bâtiments
          </h1>
          <p className="text-gray-600">
            Gérez vos propriétés et unités de location
          </p>
        </div>
        <div className="flex space-x-2">
          <Dialog open={isAddUnitDialogOpen} onOpenChange={setIsAddUnitDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Nouvelle unité
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Ajouter une nouvelle unité</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="building">Bâtiment *</Label>
                  <Select value={newUnit.buildingId} onValueChange={(value) => setNewUnit(prev => ({ ...prev, buildingId: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un bâtiment" />
                    </SelectTrigger>
                    <SelectContent>
                      {buildings.map((building) => (
                        <SelectItem key={building.id} value={building.id}>
                          {building.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="unitNumber">Numéro d'unité *</Label>
                  <Input
                    id="unitNumber"
                    value={newUnit.unitNumber}
                    onChange={(e) => setNewUnit(prev => ({ ...prev, unitNumber: e.target.value }))}
                    placeholder="Ex: A1, B2, Garage 1"
                  />
                </div>

                <div>
                  <Label htmlFor="type">Type *</Label>
                  <Select value={newUnit.type} onValueChange={(value: 'apartment' | 'garage') => setNewUnit(prev => ({ ...prev, type: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="apartment">Appartement</SelectItem>
                      <SelectItem value="garage">Garage</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="surface">Surface (m²)</Label>
                    <Input
                      id="surface"
                      type="number"
                      value={newUnit.surface}
                      onChange={(e) => setNewUnit(prev => ({ ...prev, surface: Number(e.target.value) }))}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label htmlFor="rooms">Nombre de pièces</Label>
                    <Input
                      id="rooms"
                      type="number"
                      value={newUnit.rooms}
                      onChange={(e) => setNewUnit(prev => ({ ...prev, rooms: Number(e.target.value) }))}
                      placeholder="1"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="status">Statut</Label>
                  <Select value={newUnit.status} onValueChange={(value: 'free' | 'occupied') => setNewUnit(prev => ({ ...prev, status: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="free">Libre</SelectItem>
                      <SelectItem value="occupied">Occupé</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex space-x-3 pt-4">
                  <Button onClick={handleAddUnit} className="flex-1">
                    <Save className="w-4 h-4 mr-2" />
                    Ajouter
                  </Button>
                  <Button variant="outline" onClick={() => setIsAddUnitDialogOpen(false)} className="flex-1">
                    <X className="w-4 h-4 mr-2" />
                    Annuler
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Nouveau bâtiment
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Ajouter un nouveau bâtiment</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Nom du bâtiment *</Label>
                  <Input
                    id="name"
                    value={newBuilding.name}
                    onChange={(e) => setNewBuilding(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Ex: Résidence Les Jardins"
                  />
                </div>

                <div>
                  <Label htmlFor="address">Adresse complète *</Label>
                  <Textarea
                    id="address"
                    value={newBuilding.address}
                    onChange={(e) => setNewBuilding(prev => ({ ...prev, address: e.target.value }))}
                    placeholder="Adresse complète du bâtiment"
                    rows={3}
                  />
                </div>

                <div className="flex space-x-3 pt-4">
                  <Button onClick={handleAddBuilding} className="flex-1">
                    <Save className="w-4 h-4 mr-2" />
                    Ajouter
                  </Button>
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} className="flex-1">
                    <X className="w-4 h-4 mr-2" />
                    Annuler
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Barre de recherche */}
      <div className="mb-6">
        <Input
          placeholder="Rechercher un bâtiment..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-md"
        />
      </div>

      {/* Liste des bâtiments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredBuildings.map((building) => {
          const buildingUnits = getUnitsForBuilding(building.id)
          const occupancyStats = getOccupancyStats(building.id)
          const apartments = buildingUnits.filter(unit => unit.type === 'apartment')
          const garages = buildingUnits.filter(unit => unit.type === 'garage')

          return (
            <Card key={building.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex items-center space-x-3">
                    <Building2 className="w-8 h-8 text-blue-600" />
                    <div>
                      <CardTitle className="text-xl">{building.name}</CardTitle>
                      <div className="flex items-center text-gray-500 mt-1">
                        <MapPin className="w-4 h-4 mr-1" />
                        <span className="text-sm">{building.address}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setEditingBuilding(building)
                        setIsEditDialogOpen(true)
                      }}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleDeleteBuilding(building.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Statistiques d'occupation */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium">Taux d'occupation</span>
                    <Badge variant={occupancyStats.rate >= 80 ? "default" : "secondary"}>
                      {occupancyStats.rate}%
                    </Badge>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${occupancyStats.rate}%` }}
                    ></div>
                  </div>
                  <p className="text-sm text-gray-600 mt-2">
                    {occupancyStats.occupied}/{occupancyStats.total} unités occupées
                  </p>
                </div>

                {/* Répartition des unités */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <Home className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                    <p className="font-semibold text-blue-900">{apartments.length}</p>
                    <p className="text-sm text-blue-700">Appartements</p>
                  </div>
                  {garages.length > 0 && (
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <Car className="w-6 h-6 text-gray-600 mx-auto mb-2" />
                      <p className="font-semibold text-gray-900">{garages.length}</p>
                      <p className="text-sm text-gray-700">Garages</p>
                    </div>
                  )}
                </div>

                {/* Liste des unités */}
                <div className="space-y-2">
                  <h4 className="font-medium text-gray-900">Unités</h4>
                  {buildingUnits.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                      {buildingUnits.map((unit) => (
                        <div
                          key={unit.id}
                          className="flex items-center justify-between p-2 bg-white border rounded"
                        >
                          <div className="flex items-center space-x-2">
                            {unit.type === 'apartment' ? (
                              <Home className="w-4 h-4 text-blue-600" />
                            ) : (
                              <Car className="w-4 h-4 text-gray-600" />
                            )}
                            <span className="text-sm font-medium">{unit.unitNumber}</span>
                          </div>
                          <Badge
                            variant={unit.status === 'occupied' ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {unit.status === 'occupied' ? 'Occupé' : 'Libre'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 italic">Aucune unité créée</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {filteredBuildings.length === 0 && (
        <div className="text-center py-12">
          <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">Aucun bâtiment trouvé</p>
          <p className="text-sm text-gray-400">
            {buildings.length === 0 
              ? "Commencez par ajouter votre premier bâtiment" 
              : "Essayez de modifier vos critères de recherche"
            }
          </p>
        </div>
      )}

      {/* Dialog pour modifier un bâtiment */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Modifier le bâtiment</DialogTitle>
          </DialogHeader>
          {editingBuilding && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="editName">Nom du bâtiment *</Label>
                <Input
                  id="editName"
                  value={editingBuilding.name}
                  onChange={(e) => setEditingBuilding(prev => prev ? { ...prev, name: e.target.value } : null)}
                  placeholder="Ex: Résidence Les Jardins"
                />
              </div>

              <div>
                <Label htmlFor="editAddress">Adresse complète *</Label>
                <Textarea
                  id="editAddress"
                  value={editingBuilding.address}
                  onChange={(e) => setEditingBuilding(prev => prev ? { ...prev, address: e.target.value } : null)}
                  placeholder="Adresse complète du bâtiment"
                  rows={3}
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <Button onClick={handleEditBuilding} className="flex-1">
                  <Save className="w-4 h-4 mr-2" />
                  Sauvegarder
                </Button>
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} className="flex-1">
                  <X className="w-4 h-4 mr-2" />
                  Annuler
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}