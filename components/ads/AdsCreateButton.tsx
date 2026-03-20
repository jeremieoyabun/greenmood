'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Plus } from 'lucide-react'
import { CreateCampaignModal } from '@/components/ads/CreateCampaignModal'

export function AdsCreateButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button variant="primary" size="sm" onClick={() => setOpen(true)}>
        <Plus className="w-4 h-4 mr-1" /> Create Campaign
      </Button>
      <CreateCampaignModal open={open} onClose={() => setOpen(false)} onCreated={() => window.location.reload()} />
    </>
  )
}
