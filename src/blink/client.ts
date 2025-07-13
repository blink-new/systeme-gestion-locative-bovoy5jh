import { createClient } from '@blinkdotnew/sdk'

export const blink = createClient({
  projectId: 'systeme-gestion-locative-bovoy5jh',
  authRequired: true
})

// Types pour les données
export interface Building {
  id: string
  name: string
  address: string
  createdAt: string
  updatedAt: string
}

export interface Unit {
  id: string
  buildingId: string
  unitNumber: string
  type: 'apartment' | 'garage'
  surface: number
  rooms: number
  status: 'free' | 'occupied'
  createdAt: string
  updatedAt: string
}

export interface Tenant {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  address: string
  buildingId?: string | null
  idDocumentUrl?: string | null
  createdAt: string
  updatedAt: string
}

export interface Contract {
  id: string
  tenantId: string
  unitId: string
  startDate: string
  endDate: string | null
  rentAmount: number
  deposit: number
  status: 'active' | 'inactive'
  documentUrl: string | null
  createdAt: string
  updatedAt: string
}

export interface Invoice {
  id: string
  contractId: string
  month: number
  year: number
  baseRent: number
  electricity: number
  water: number
  stairCleaning: number
  otherServices: number
  totalAmount: number
  isPaid: boolean
  paidDate: string | null
  documentUrl?: string | null
  createdAt: string
  updatedAt: string
}