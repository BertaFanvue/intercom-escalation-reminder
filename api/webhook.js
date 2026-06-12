export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  console.log('Full payload:', JSON.stringify(req.body, null, 2));

  const topic = req.body?.topic;
  const tag = req.body?.data?.item?.tag?.name;
  const conversationId = req.body?.data?.item?.conversation_id;
  const assignedAgentId = req.body?.data?.item?.conversation?.assignee?.id;

  console.log('Topic:', topic);
  console.log('Tag:', tag);
  console.log('Conversation ID:', conversationId);
  console.log('Assigned Agent ID:', assignedAgentId);

  if (topic !== 'conversation_part.tag.created' || tag !== 'Escalated') {
    console.log('Filter did not match, ignoring');
    return res.status(200).json({ message: 'Ignored' });
  }

  const noteBody = assignedAgentId
    ? `<p>Reminder: this case has been escalated. Please add a note with the link to the external escalation ticket.</p><p><mention id="${assignedAgentId}"></mention></p>`
    : `<p>Reminder: this case has been escalated. Please add a note with the link to the external escalation ticket.</p>`;

  const response = await fetch(`https://api.intercom.io/conversations/${conversationId}/reply`, {
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

  if (!response.ok) {
    const error = await response.json();
    console.error('Intercom API error:', error);
    return res.status(500).json({ message: 'Failed to post note', error });
  }

  return res.status(200).json({ message: 'Note posted successfully' });
}
