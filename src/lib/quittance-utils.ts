import { useState, useEffect } from 'react'
import { blink } from '@/blink/client'

export interface QuittanceData {
  id?: string
  numeroQuittance: string
  nomProprietaire: string
  nomLocataire: string
  adresseComplete: string
  dateDebutPeriode: string
  dateFinPeriode: string
  loyerNet: number
  chargesGardien: number
  chargesElectricite: number
  chargesEau: number
  autresCharges: Array<{ libelle: string; montant: number }>
  villeSignataire: string
  dateEmission: string
  createdAt?: string
  updatedAt?: string
}

// Composant pour générer automatiquement un numéro de quittance
export function generateQuittanceNumber(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = (now.getMonth() + 1).toString().padStart(2, '0')
  const timestamp = now.getTime().toString().slice(-6)
  return `Q-${year}-${month}-${timestamp}`
}

// Conversion chiffres en lettres (français)
export function nombreEnLettres(nombre: number): string {
  const unites = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf']
  const dizaines = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante-dix', 'quatre-vingt', 'quatre-vingt-dix']
  const teens = ['dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf']

  if (nombre === 0) return 'zéro'
  if (nombre < 0) return 'moins ' + nombreEnLettres(-nombre)

  let result = ''

  // Millions
  if (nombre >= 1000000) {
    const millions = Math.floor(nombre / 1000000)
    result += nombreEnLettres(millions) + (millions === 1 ? ' million ' : ' millions ')
    nombre %= 1000000
  }

  // Milliers
  if (nombre >= 1000) {
    const milliers = Math.floor(nombre / 1000)
    if (milliers === 1) {
      result += 'mille '
    } else {
      result += nombreEnLettres(milliers) + ' mille '
    }
    nombre %= 1000
  }

  // Centaines
  if (nombre >= 100) {
    const centaines = Math.floor(nombre / 100)
    if (centaines === 1) {
      result += 'cent '
    } else {
      result += unites[centaines] + ' cent '
    }
    nombre %= 100
  }

  // Dizaines et unités
  if (nombre >= 20) {
    const diz = Math.floor(nombre / 10)
    const unit = nombre % 10
    result += dizaines[diz]
    if (unit > 0) {
      result += '-' + unites[unit]
    }
  } else if (nombre >= 10) {
    result += teens[nombre - 10]
  } else if (nombre > 0) {
    result += unites[nombre]
  }

  return result.trim()
}

// Hook pour la gestion des quittances
export function useQuittanceManager() {
  const [quittances, setQuittances] = useState<QuittanceData[]>([])
  const [loading, setLoading] = useState(true)

  const loadQuittances = async () => {
    try {
      setLoading(true)
      const user = await blink.auth.me()
      if (!user) return

      const data = await blink.db.quittances.list({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' }
      })

      // Convertir les données de la DB vers le format QuittanceData
      const formattedQuittances: QuittanceData[] = data.map((item: any) => ({
        id: item.id,
        numeroQuittance: item.numeroQuittance,
        nomProprietaire: item.nomProprietaire,
        nomLocataire: item.nomLocataire,
        adresseComplete: item.adresseComplete,
        dateDebutPeriode: item.dateDebutPeriode,
        dateFinPeriode: item.dateFinPeriode,
        loyerNet: item.loyerNet,
        chargesGardien: item.chargesGardien,
        chargesElectricite: item.chargesElectricite,
        chargesEau: item.chargesEau,
        autresCharges: item.autresCharges ? JSON.parse(item.autresCharges) : [],
        villeSignataire: item.villeSignataire,
        dateEmission: item.dateEmission,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt
      }))

      setQuittances(formattedQuittances)
    } catch (error) {
      console.error('Erreur lors du chargement des quittances:', error)
    } finally {
      setLoading(false)
    }
  }

  const saveQuittance = async (data: QuittanceData) => {
    try {
      const user = await blink.auth.me()
      if (!user) {
        throw new Error('Utilisateur non connecté')
      }

      const quittanceData = {
        id: data.id || generateQuittanceNumber(),
        userId: user.id,
        numeroQuittance: data.numeroQuittance,
        nomProprietaire: data.nomProprietaire,
        nomLocataire: data.nomLocataire,
        adresseComplete: data.adresseComplete,
        dateDebutPeriode: data.dateDebutPeriode,
        dateFinPeriode: data.dateFinPeriode,
        loyerNet: data.loyerNet,
        chargesGardien: data.chargesGardien,
        chargesElectricite: data.chargesElectricite,
        chargesEau: data.chargesEau,
        autresCharges: JSON.stringify(data.autresCharges),
        villeSignataire: data.villeSignataire,
        dateEmission: data.dateEmission
      }

      if (data.id) {
        // Mise à jour
        await blink.db.quittances.update(data.id, quittanceData)
      } else {
        // Création
        await blink.db.quittances.create(quittanceData)
      }

      await loadQuittances() // Recharger les données
      return true
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error)
      return false
    }
  }

  const deleteQuittance = async (id: string) => {
    try {
      await blink.db.quittances.delete(id)
      await loadQuittances() // Recharger les données
      return true
    } catch (error) {
      console.error('Erreur lors de la suppression:', error)
      return false
    }
  }

  useEffect(() => {
    loadQuittances()
  }, [])

  return {
    quittances,
    loading,
    saveQuittance,
    loadQuittances,
    deleteQuittance
  }
}