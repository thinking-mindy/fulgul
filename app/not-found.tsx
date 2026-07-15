"use client";

import { Box, Typography, Button, Card, CardContent } from '@mui/material';
import { useRouter } from 'next/navigation';
import HomeIcon from '@mui/icons-material/Home';

export default function NotFound() {
  const router = useRouter();

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        bgcolor: 'background.default',
      }}
    >
      <Card sx={{ maxWidth: 500, textAlign: 'center' }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h1" sx={{ fontWeight: 700, mb: 2, fontSize: '4rem' }}>
            404
          </Typography>
          <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
            Page Not Found
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
            The page you're looking for doesn't exist or has been moved.
          </Typography>
          <Button
            variant="contained"
            startIcon={<HomeIcon />}
            onClick={() => router.push('/')}
            size="large"
          >
            Go to Dashboard
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
}

