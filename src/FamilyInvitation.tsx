import { Fragment } from 'react'
import { wedding } from './content'
import type { InvitationContent } from './content'

export default function FamilyInvitation({ content }: { content: InvitationContent }) {
  const couple = {
    groom: { name: 'Sohan', parents: `Son of ${wedding.families.groomParents}` },
    bride: { name: 'Aastha', parents: `Daughter of ${wedding.families.brideParents}` },
  }
  return <div className="family-invitation compact">
    <p className="formal-invite">{content.request}</p>
    <div className="family-couple">
      {content.coupleOrder.map((side, index) => <Fragment key={side}>
        {index > 0 && <span className="family-ampersand">and</span>}
        <div className="family-person"><h3>{couple[side].name}</h3><p>{couple[side].parents}</p></div>
      </Fragment>)}
    </div>
    <p className="formal-invite invitation-closing">{content.blessing}</p>
  </div>
}