export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const topic = req.body?.topic;
  const conversationId = req.body?.data?.item?.id;

  console.log('Topic:', topic);
  console.log('Conversation ID:', conversationId);

  if (topic !== 'conversation.admin.closed') {
    console.log('Not a close event, ignoring');
    return res.status(200).json({ message: 'Ignored' });
  }

  // Fetch the full conversation to check tags
  const convResponse = await fetch(`https://api.intercom.io/conversations/${conversationId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${process.env.INTERCOM_API_TOKEN}`,
      'Content-Type': 'application/json',
      'Intercom-Version': '2.10'
    }
  });

  const conversation = await convResponse.json();
  console.log('Tags:', JSON.stringify(conversation.tags));

  const tags = conversation?.tags?.tags || [];
  const isEscalated = tags.some(tag => tag.name === 'Escalated');

  if (!isEscalated) {
    console.log('No Escalated tag found, ignoring');
    return res.status(200).json({ message: 'Not escalated, ignored' });
  }

  const assignedAgentId = conversation?.assignee?.id || conversation?.admin_assignee_id;
  console.log('Assigned Agent ID:', assignedAgentId);
  console.log('Full assignee:', JSON.stringify(conversation?.assignee));

  const noteBody = `<p>Reminder: this case has been escalated. Please add a note with the link to the external escalation ticket.</p>`;

  const noteResponse = await fetch(`https://api.intercom.io/conversations/${conversationId}/parts`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.INTERCOM_API_TOKEN}`,
      'Content-Type': 'application/json',
      'Intercom-Version': '2.10'
    },
    body: JSON.stringify({
      message_type: 'note',
      type: 'admin',
      admin_id: process.env.INTERCOM_ADMIN_ID,
      body: noteBody
    })
  });

  if (!noteResponse.ok) {
    const error = await noteResponse.json();
    console.error('Intercom API error:', error);
    return res.status(500).json({ message: 'Failed to post note', error });
  }

  console.log('Note posted successfully');
  return res.status(200).json({ message: 'Note posted successfully' });
}
